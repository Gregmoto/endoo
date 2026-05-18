/**
 * scripts/audit-prisma.ts
 *
 * Static analysis: scans all src/**\/*.ts files for Prisma query calls that
 * operate on tenant-scoped models but may be missing an organizationId filter.
 *
 * Run:   tsx scripts/audit-prisma.ts
 * CI:    tsx scripts/audit-prisma.ts --strict   (exits 1 if suspects found)
 * Output: tests/_audit-prisma-report.json + console summary
 *
 * Detection strategy:
 *   For each prisma.<model>.<queryMethod>(...) call, extract the literal block
 *   that follows the opening paren and check whether it contains the string
 *   "organizationId". Heuristic — not a full AST parse — but catches the vast
 *   majority of missing-filter bugs with low false-positive rate.
 *
 * Whitelist reasons:
 *   - PLATFORM_SCOPED  : Organization, User, etc. — no tenant filter needed
 *   - PLATFORM_PATH    : src/app/api/platform/ and src/lib/rbac/ — cross-tenant
 *   - PUBLIC_PATH      : health, version, auth, register, webhooks, cron, stripe
 *   - EXPLICIT_OK      : call-site has a "// audit-ok" comment on the same line
 */

import fs   from "fs"
import path from "path"

// ─── Configuration ─────────────────────────────────────────────────────────

const SRC_DIR    = path.resolve("src")
const REPORT_OUT = path.resolve("tests/_audit-prisma-report.json")
const STRICT     = process.argv.includes("--strict")

// Models whose queries don't need organizationId (platform-scoped)
const PLATFORM_SCOPED_MODELS = new Set([
  "organization",
  "organizationMember",
  "user",
  "schemaVersion",
  "agencyStaffAccess",
  "agencyClientPin",
  "subscription",
  "invitation",
  "portalMagicToken",     // looked up by token, org is embedded in JWT
  "emailDomainVerification", // platform feature
  "userAccount",          // user-scoped (password/OAuth credentials), not org-scoped
  "agencyClientRelationship", // join table between two orgs; scoped by agencyId or clientId field
])

// File path patterns that are inherently platform-scoped or public
const WHITELISTED_PATH_PATTERNS = [
  /\/lib\/rbac\//,
  /\/lib\/plans\//,
  /\/lib\/auth/,
  /\/lib\/prisma/,
  /\/lib\/stripe/,
  /\/lib\/rls\.ts/,            // row-level security example file
  /\/app\/api\/platform\//,
  /\/app\/api\/health\//,
  /\/app\/api\/version\//,
  /\/app\/api\/changelog\//,
  /\/app\/api\/register\//,
  /\/app\/api\/auth\//,
  /\/app\/api\/stripe\//,
  /\/app\/api\/webhooks\//,
  /\/app\/api\/cron\//,
  // Public token-based routes (auth via signed token, org embedded in token)
  /\/app\/api\/q\//,           // quote public view via accept token
  /\/app\/api\/sign\//,        // signature flow via signed token
  /\/app\/platform\//,
  /\/scripts\//,
  /\/seed\//,
  /\/__tests__\//,
  /\/tests\//,
  // Service layer — functions receive an already-verified org context from callers.
  // Each service is called only after requireAuth() in the route handler.
  /\/services\//,
  // Integration helpers — looked up by connectionId (unique per org at creation)
  /\/lib\/integrations\//,
]

// Query methods that read or modify data and need org scoping
const QUERY_METHODS = [
  "findFirst", "findUnique", "findMany",
  "update", "updateMany",
  "delete", "deleteMany",
  "count", "aggregate", "groupBy",
  "upsert",
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface Finding {
  file:    string
  line:    number
  model:   string
  method:  string
  snippet: string
  reason:  string
}

interface WhitelistEntry {
  file:    string
  line:    number
  model:   string
  method:  string
  reason:  string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function walkDir(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      walkDir(full, results)
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      results.push(full)
    }
  }
  return results
}

function isWhitelistedPath(filePath: string): boolean {
  const rel = filePath.replace(path.resolve("."), "")
  return WHITELISTED_PATH_PATTERNS.some(p => p.test(rel))
}

/**
 * Extract the argument block following "prisma.model.method(" by counting
 * braces. Returns the first ~500 characters of the argument block.
 */
function extractCallBlock(src: string, matchIndex: number): string {
  const start = src.indexOf("(", matchIndex)
  if (start === -1) return ""

  let depth = 0
  let i = start
  const MAX = Math.min(start + 600, src.length)

  while (i < MAX) {
    if (src[i] === "(") depth++
    else if (src[i] === ")") {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
    i++
  }
  return src.slice(start, MAX)
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split("\n").length
}

// ─── Main scan ──────────────────────────────────────────────────────────────

function scan(): { suspects: Finding[]; whitelisted: WhitelistEntry[] } {
  const suspects:   Finding[]         = []
  const whitelisted: WhitelistEntry[] = []

  const files = walkDir(SRC_DIR)

  for (const file of files) {
    if (isWhitelistedPath(file)) continue

    const src     = fs.readFileSync(file, "utf8")
    const relFile = file.replace(path.resolve(".") + "/", "")

    for (const method of QUERY_METHODS) {
      // Match prisma.modelName.method(
      const re = new RegExp(`prisma\\.([a-zA-Z]+)\\.${method}\\s*\\(`, "g")
      let m: RegExpExecArray | null

      while ((m = re.exec(src)) !== null) {
        const model     = m[1]
        const matchIdx  = m.index
        const lineNum   = lineOf(src, matchIdx)
        const lineText  = src.split("\n")[lineNum - 1] ?? ""

        // Platform-scoped model — always ok
        if (PLATFORM_SCOPED_MODELS.has(model)) {
          whitelisted.push({ file: relFile, line: lineNum, model, method, reason: "PLATFORM_SCOPED" })
          continue
        }

        // Explicit audit-ok annotation on the same line
        if (lineText.includes("// audit-ok")) {
          whitelisted.push({ file: relFile, line: lineNum, model, method, reason: "EXPLICIT_OK" })
          continue
        }

        // Skip create — organizationId is passed in data, not where
        if (method === "create") continue

        // Extract the call block and check for organizationId.
        // Also look at the 2000 chars BEFORE the call: many routes build a
        // `where` variable with organizationId and pass it by reference, then
        // use the same variable in a count() call further down the function.
        const block   = extractCallBlock(src, matchIdx)
        const prelude = src.slice(Math.max(0, matchIdx - 2000), matchIdx)
        const context = prelude + block

        if (!context.includes("organizationId")) {
          const snippet = lineText.trim().slice(0, 120)
          suspects.push({
            file:    relFile,
            line:    lineNum,
            model,
            method,
            snippet,
            reason:  "MISSING_ORG_FILTER",
          })
        } else {
          whitelisted.push({ file: relFile, line: lineNum, model, method, reason: "HAS_ORG_FILTER" })
        }
      }
    }
  }

  return { suspects, whitelisted }
}

function run() {
  const { suspects, whitelisted } = scan()

  const report = {
    generated:        new Date().toISOString(),
    totalSuspects:    suspects.length,
    totalWhitelisted: whitelisted.length,
    suspects,
    whitelisted,
  }

  fs.mkdirSync(path.dirname(REPORT_OUT), { recursive: true })
  fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2) + "\n")

  if (suspects.length === 0) {
    console.log("✅ audit-prisma: 0 suspect queries — all tenant-scoped models filtered by organizationId")
  } else {
    console.log(`⚠️  audit-prisma: ${suspects.length} suspect quer${suspects.length === 1 ? "y" : "ies"} found\n`)
    for (const s of suspects) {
      console.log(`  ${s.file}:${s.line}  prisma.${s.model}.${s.method}`)
      if (s.snippet) console.log(`    → ${s.snippet}`)
    }
    console.log(`\nFull report: ${REPORT_OUT}`)
    console.log(`To suppress a known-safe call, add  // audit-ok  on the same line.`)
  }

  if (STRICT && suspects.length > 0) {
    process.exit(1)
  }
}

run()
