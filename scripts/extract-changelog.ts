#!/usr/bin/env tsx
/**
 * Extracts the changelog section for a given version from CHANGELOG.md.
 * Used by GitHub Actions release workflow.
 *
 * Usage: tsx scripts/extract-changelog.ts 0.2.0
 * Output: markdown string for that version section (stdout)
 */

import { readFileSync } from "fs"
import { resolve } from "path"

const version = process.argv[2]
if (!version) {
  console.error("Usage: tsx scripts/extract-changelog.ts <version>")
  process.exit(1)
}

const root = resolve(__dirname, "..")
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8")

const escapedVersion = version.replace(/\./g, "\\.")
const sectionRegex = new RegExp(
  `## \\[${escapedVersion}\\][^\n]*\n([\s\S]*?)(?=\n## \\[|$)`
)

const match = changelog.match(sectionRegex)
if (!match) {
  console.error(`No changelog entry found for version ${version}`)
  process.exit(1)
}

process.stdout.write(match[1].trim())
