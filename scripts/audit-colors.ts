import fs from "fs"
import path from "path"

const SRC_DIR  = path.resolve("src")
const OUT_DIR  = path.resolve(".audit")
const OUT_FILE = path.join(OUT_DIR, "color-issues.json")

// ─── Exclusions ────────────────────────────────────────────────────────────

const EXCLUDED_DIRS = [
  path.resolve("src/lib/pdf"),
  path.resolve("src/emails"),
  path.resolve("src/lib/email.ts"),
  path.resolve("src/lib/signing"),
  path.resolve("src/lib/quotes/emails.ts"),
  path.resolve("src/lib/portal/emails.ts"),
  path.resolve("src/lib/notifications/templates"),
  path.resolve("src/services/approval/notifications.ts"),
  path.resolve("scripts"),
  path.resolve("node_modules"),
]

function isExcluded(filePath: string): boolean {
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) return true
  if (filePath.endsWith("globals.css")) return true
  for (const dir of EXCLUDED_DIRS) {
    if (filePath.startsWith(dir) || filePath === dir) return true
  }
  return false
}

// ─── Semantic / safe classes that don't need dark: ─────────────────────────

const SEMANTIC_TEXT = /\btext-(foreground|muted-foreground|primary|secondary|destructive|accent|card-foreground|popover-foreground|sidebar-foreground|sidebar-primary|sidebar-accent)\b/
const SEMANTIC_BG   = /\bbg-(background|card|popover|primary|secondary|destructive|muted|accent|sidebar|sidebar-primary|sidebar-accent)\b/
const SEMANTIC_BDR  = /\bborder(-border)?\b/

// ─── Suggestion map ─────────────────────────────────────────────────────────

const SUGGESTIONS: Record<string, string> = {
  "text-gray-900":   "text-foreground",
  "text-gray-800":   "text-foreground",
  "text-gray-700":   "text-foreground",
  "text-gray-600":   "text-muted-foreground",
  "text-gray-500":   "text-muted-foreground",
  "text-gray-400":   "text-muted-foreground",
  "text-black":      "text-foreground",
  "text-white":      "text-primary-foreground (check context)",
  "bg-white":        "bg-card or bg-background",
  "bg-gray-50":      "bg-muted",
  "bg-gray-100":     "bg-muted",
  "bg-gray-200":     "bg-accent",
  "border-gray-200": "border",
  "border-gray-300": "border",
  "hover:bg-gray-100": "hover:bg-accent",
  "hover:bg-gray-50":  "hover:bg-accent",
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hasDarkText(cls: string): boolean   { return /dark:text-/.test(cls) }
function hasDarkBg(cls: string): boolean     { return /dark:bg-/.test(cls) }
function hasDarkBorder(cls: string): boolean { return /dark:border-/.test(cls) }

function extractClassNameBlocks(source: string): Array<{ block: string; startIndex: number }> {
  const results: Array<{ block: string; startIndex: number }> = []

  // Match className="..." (double or single quotes)
  const staticRe = /className=(?:"([^"]*?)"|'([^']*?)')/g
  let m: RegExpExecArray | null
  while ((m = staticRe.exec(source)) !== null) {
    const block = m[1] ?? m[2] ?? ""
    results.push({ block, startIndex: m.index })
  }

  // Match className={`...`} template literals (no nested ${...} handling — heuristic)
  const tplRe = /className=\{`([^`]*?)`\}/g
  while ((m = tplRe.exec(source)) !== null) {
    results.push({ block: m[1], startIndex: m.index })
  }

  // Match cn(...) / clsx(...) / cva(...) calls — grab the full argument string heuristically
  const cnRe = /\bcn\(([^)]{0,2000})\)/g
  while ((m = cnRe.exec(source)) !== null) {
    results.push({ block: m[1], startIndex: m.index })
  }

  return results
}

function lineOfIndex(source: string, idx: number): number {
  return source.slice(0, idx).split("\n").length
}

// ─── Issue types ─────────────────────────────────────────────────────────────

interface Issue {
  file: string
  line: number
  match: string
  suggestion: string
}

// ─── Error patterns ──────────────────────────────────────────────────────────

function checkErrors(
  source: string,
  relPath: string,
  errors: Issue[]
): void {
  const blocks = extractClassNameBlocks(source)

  for (const { block, startIndex } of blocks) {
    const lineBase = lineOfIndex(source, startIndex)

    // text-gray-{400..900} without dark:text-
    const textGrayRe = /\btext-gray-(400|500|600|700|800|900)\b/g
    let m: RegExpExecArray | null
    while ((m = textGrayRe.exec(block)) !== null) {
      if (!hasDarkText(block) && !SEMANTIC_TEXT.test(block)) {
        errors.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: SUGGESTIONS[m[0]] ?? "text-muted-foreground",
        })
      }
    }

    // text-zinc- / text-slate- / text-neutral- without dark:text-
    const textOtherRe = /\btext-(zinc|slate|neutral)-\d{2,3}\b/g
    while ((m = textOtherRe.exec(block)) !== null) {
      if (!hasDarkText(block)) {
        errors.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: "text-foreground or text-muted-foreground",
        })
      }
    }

    // bg-white without dark:bg- (skip bg-white/[opacity] variants — those are intentional overlays)
    if (/\bbg-white(?!\/)/.test(block) && !hasDarkBg(block) && !SEMANTIC_BG.test(block)) {
      errors.push({
        file: relPath,
        line: lineBase,
        match: "bg-white",
        suggestion: SUGGESTIONS["bg-white"]!,
      })
    }

    // bg-gray-{50,100,200} without dark:bg-
    const bgGrayRe = /\bbg-gray-(50|100|200)\b/g
    while ((m = bgGrayRe.exec(block)) !== null) {
      if (!hasDarkBg(block) && !SEMANTIC_BG.test(block)) {
        errors.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: SUGGESTIONS[m[0]] ?? "bg-muted",
        })
      }
    }

    // border-gray-{200,300} without dark:border-
    const bdrGrayRe = /\bborder-gray-(200|300)\b/g
    while ((m = bdrGrayRe.exec(block)) !== null) {
      if (!hasDarkBorder(block) && !SEMANTIC_BDR.test(block)) {
        errors.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: SUGGESTIONS[m[0]] ?? "border",
        })
      }
    }

    // text-black (not inside dark:text-black)
    const textBlackRe = /(?<!dark:)\btext-black\b/g
    while ((m = textBlackRe.exec(block)) !== null) {
      if (!hasDarkText(block)) {
        errors.push({
          file: relPath,
          line: lineBase,
          match: "text-black",
          suggestion: SUGGESTIONS["text-black"]!,
        })
      }
    }
  }

  // Hardcoded hex colours (outside className blocks — scan whole file)
  const hexRe = /#[0-9a-fA-F]{3,8}\b/g
  let m: RegExpExecArray | null
  while ((m = hexRe.exec(source)) !== null) {
    const line = lineOfIndex(source, m.index)
    const lineStr = source.split("\n")[line - 1] ?? ""
    // Skip CSS variable declarations, comments, and audit-ok suppressions
    if (/^\s*\/\//.test(lineStr)) continue
    if (/^\s*\*/.test(lineStr)) continue
    if (/audit-ok/.test(lineStr)) continue
    errors.push({
      file: relPath,
      line,
      match: m[0],
      suggestion: "use a CSS variable or Tailwind token instead of hardcoded hex",
    })
  }
}

// ─── Warning patterns ────────────────────────────────────────────────────────

function checkWarnings(
  source: string,
  relPath: string,
  warnings: Issue[]
): void {
  const blocks = extractClassNameBlocks(source)

  for (const { block, startIndex } of blocks) {
    const lineBase = lineOfIndex(source, startIndex)

    // placeholder:text-gray- without dark:
    const placeholderRe = /\bplaceholder:text-gray-\d{2,3}\b/g
    let m: RegExpExecArray | null
    while ((m = placeholderRe.exec(block)) !== null) {
      if (!hasDarkText(block)) {
        warnings.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: "placeholder:text-muted-foreground",
        })
      }
    }

    // hover:bg-gray- without dark:
    const hoverBgRe = /\bhover:bg-gray-\d{2,3}\b/g
    while ((m = hoverBgRe.exec(block)) !== null) {
      if (!hasDarkBg(block)) {
        warnings.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: SUGGESTIONS[m[0]] ?? "hover:bg-accent",
        })
      }
    }

    // text-white without dark: (usually correct on colored backgrounds — warning only)
    const textWhiteRe = /(?<!dark:)\btext-white\b/g
    while ((m = textWhiteRe.exec(block)) !== null) {
      if (!hasDarkText(block)) {
        warnings.push({
          file: relPath,
          line: lineBase,
          match: "text-white",
          suggestion: "verify text-white is on a colored background; use text-primary-foreground if on bg-primary",
        })
      }
    }

    // opacity-50/60/70 on text elements (prefer text-muted-foreground)
    const opacityRe = /\b(opacity-(?:50|60|70))\b/g
    while ((m = opacityRe.exec(block)) !== null) {
      if (/\btext-/.test(block)) {
        warnings.push({
          file: relPath,
          line: lineBase,
          match: m[0],
          suggestion: "use text-muted-foreground instead of opacity on text",
        })
      }
    }
  }

  // style={{ with color: inside
  const styleColorRe = /style=\{\{[^}]*color\s*:/g
  let m: RegExpExecArray | null
  while ((m = styleColorRe.exec(source)) !== null) {
    warnings.push({
      file: relPath,
      line: lineOfIndex(source, m.index),
      match: "style={{ color:",
      suggestion: "use Tailwind text- class instead of inline style color",
    })
  }
}

// ─── File walker ─────────────────────────────────────────────────────────────

function walk(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.some((d) => full.startsWith(d))) {
        results.push(...walk(full))
      }
    } else if (entry.isFile() && (full.endsWith(".tsx") || full.endsWith(".ts"))) {
      if (!isExcluded(full)) results.push(full)
    }
  }
  return results
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  let maxErrors: number | null = null
  const maxIdx = args.indexOf("--max-errors")
  if (maxIdx !== -1 && args[maxIdx + 1] !== undefined) {
    maxErrors = parseInt(args[maxIdx + 1]!, 10)
  }

  const errors: Issue[]   = []
  const warnings: Issue[] = []
  const affectedFiles = new Set<string>()

  const files = walk(SRC_DIR)

  for (const filePath of files) {
    const source  = fs.readFileSync(filePath, "utf8")
    const relPath = path.relative(process.cwd(), filePath)

    const prevE = errors.length
    const prevW = warnings.length

    checkErrors(source, relPath, errors)
    checkWarnings(source, relPath, warnings)

    if (errors.length > prevE || warnings.length > prevW) {
      affectedFiles.add(relPath)
    }
  }

  const summary = {
    totalErrors:   errors.length,
    totalWarnings: warnings.length,
    filesAffected: affectedFiles.size,
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify({ errors, warnings, summary }, null, 2))

  console.log("\n── Color Audit Summary ─────────────────────────────────────────")
  console.log(`  Errors   : ${summary.totalErrors}`)
  console.log(`  Warnings : ${summary.totalWarnings}`)
  console.log(`  Files    : ${summary.filesAffected}`)
  console.log(`  Report   : ${OUT_FILE}`)
  console.log("────────────────────────────────────────────────────────────────\n")

  if (maxErrors !== null && errors.length > maxErrors) {
    console.error(`✖  Error count (${errors.length}) exceeds --max-errors ${maxErrors}`)
    process.exit(1)
  }
}

main()
