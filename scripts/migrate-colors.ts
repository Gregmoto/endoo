import fs from "fs"
import path from "path"

const AUDIT_FILE = path.resolve(".audit/color-issues.json")
const LOG_FILE   = path.resolve("scripts/migrate-colors.log")

// ─── Exclusions ────────────────────────────────────────────────────────────

const EXCLUDED_DIRS = [
  path.resolve("scripts"),
  path.resolve("src/lib/pdf"),
  path.resolve("src/emails"),
  path.resolve("src/lib/email.ts"),
  path.resolve("src/lib/signing"),
  path.resolve("src/lib/quotes/emails.ts"),
  path.resolve("src/lib/portal/emails.ts"),
  path.resolve("src/lib/notifications/templates"),
  path.resolve("src/services/approval/notifications.ts"),
  path.resolve("node_modules"),
]

function isExcluded(filePath: string): boolean {
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) return true
  for (const dir of EXCLUDED_DIRS) {
    if (path.resolve(filePath).startsWith(dir) || path.resolve(filePath) === path.resolve(dir)) return true
  }
  return false
}

// ─── Replacement rules ──────────────────────────────────────────────────────

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btext-gray-900\b/g, "text-foreground"],
  [/\btext-gray-800\b/g, "text-foreground"],
  [/\btext-gray-700\b/g, "text-foreground"],
  [/\btext-gray-600\b/g, "text-muted-foreground"],
  [/\btext-gray-500\b/g, "text-muted-foreground"],
  [/\btext-gray-400\b/g, "text-muted-foreground"],
  [/\btext-black\b/g,    "text-foreground"],
  [/\btext-slate-900\b/g, "text-foreground"],
  [/\btext-slate-800\b/g, "text-foreground"],
  [/\btext-slate-700\b/g, "text-foreground"],
  [/\btext-slate-600\b/g, "text-muted-foreground"],
  [/\btext-slate-500\b/g, "text-muted-foreground"],
  [/\btext-slate-400\b/g, "text-muted-foreground"],
  [/\btext-slate-300\b/g, "text-muted-foreground"],
  [/\bbg-white\b/g,      "bg-card"],
  [/\bbg-gray-50\b/g,    "bg-muted"],
  [/\bbg-gray-100\b/g,   "bg-muted"],
  [/\bbg-gray-200\b/g,   "bg-accent"],
  [/\bborder-gray-200\b/g, "border"],
  [/\bborder-gray-300\b/g, "border"],
  [/\bborder-gray-100\b/g, "border"],
  [/\bborder-gray-50\b/g,  "border-border/50"],
  [/\bhover:bg-gray-100\b/g, "hover:bg-accent"],
  [/\bhover:bg-gray-50\b/g,  "hover:bg-accent"],
]

function hasDarkText(cls: string):   boolean { return /dark:text-/.test(cls) }
function hasDarkBg(cls: string):     boolean { return /dark:bg-/.test(cls) }
function hasDarkBorder(cls: string): boolean { return /dark:border-/.test(cls) }

function hasDarkVariant(content: string, replacement: string): boolean {
  if (replacement.startsWith("text-"))  return hasDarkText(content)
  if (replacement.startsWith("bg-"))    return hasDarkBg(content)
  if (replacement.startsWith("border")) return hasDarkBorder(content)
  if (replacement.startsWith("hover:bg-")) return hasDarkBg(content)
  return false
}

function applyReplacements(content: string): string {
  let out = content
  for (const [pattern, replacement] of REPLACEMENTS) {
    pattern.lastIndex = 0
    if (!hasDarkVariant(content, replacement)) {
      out = out.replace(pattern, replacement)
    }
    pattern.lastIndex = 0
  }
  return out
}

// ─── Safe single-pass migration ─────────────────────────────────────────────
// Uses String.replace callbacks — no manual index tracking, no overlap risk.

interface Change { from: string; to: string }

function migrateSource(source: string): { result: string; changes: Change[] } {
  const changes: Change[] = []

  // Replace only in static className="..." or className='...'
  // We deliberately skip template literals and cn() to avoid JSX corruption.
  const result = source.replace(
    /(\bclassName=)(["'])((?:[^"'\\]|\\.)*?)\2/g,
    (_match, attr, q, content) => {
      const newContent = applyReplacements(content)
      if (newContent !== content) {
        changes.push({ from: content, to: newContent })
      }
      return `${attr}${q}${newContent}${q}`
    }
  )

  return { result, changes }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args   = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  if (!fs.existsSync(AUDIT_FILE)) {
    console.error(`✖  Audit file not found: ${AUDIT_FILE}`)
    console.error("   Run  tsx scripts/audit-colors.ts  first.")
    process.exit(1)
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf8")) as {
    errors: Array<{ file: string }>
  }

  const filePaths = [...new Set(audit.errors.map((e) => path.resolve(e.file)))]

  const logLines: string[] = []
  let totalChanges = 0

  for (const filePath of filePaths) {
    if (isExcluded(filePath)) continue
    if (!fs.existsSync(filePath)) continue

    const source = fs.readFileSync(filePath, "utf8")
    const { result, changes } = migrateSource(source)

    if (changes.length === 0) continue

    const relPath = path.relative(process.cwd(), filePath)
    for (const c of changes) {
      logLines.push(`${relPath}  "${c.from}"  →  "${c.to}"`)
    }
    totalChanges += changes.length

    if (!dryRun) {
      fs.writeFileSync(filePath, result, "utf8")
    }
  }

  console.log(`\n── Color Migration ${dryRun ? "(dry-run)" : "(applied)"} ────────────────────────────`)
  for (const line of logLines) {
    console.log(`  ${dryRun ? "[DRY] " : ""}${line}`)
  }
  console.log("─────────────────────────────────────────────────────────────────")
  console.log(`  Total className blocks changed : ${totalChanges}`)
  if (!dryRun && totalChanges > 0) {
    fs.writeFileSync(LOG_FILE, logLines.join("\n") + "\n", "utf8")
    console.log(`  Log written to                : ${LOG_FILE}`)
  }
  console.log("")
}

main()
