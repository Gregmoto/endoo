#!/usr/bin/env tsx
/**
 * Reads version from package.json and writes APP_VERSION + APP_VERSION_DATE
 * into src/lib/version.ts.
 *
 * Called automatically by version:bump:* scripts.
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const root = resolve(__dirname, "..")

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const newVersion: string = pkg.version

const today = new Date().toISOString().slice(0, 10)

const versionPath = resolve(root, "src/lib/version.ts")
let content = readFileSync(versionPath, "utf8")

content = content.replace(
  /export const APP_VERSION\s*=\s*["'][^"']+["']/,
  `export const APP_VERSION = "${newVersion}"`
)

content = content.replace(
  /export const APP_VERSION_DATE\s*=\s*["'][^"']+["']/,
  `export const APP_VERSION_DATE = "${today}"`
)

writeFileSync(versionPath, content, "utf8")

console.log(`✅ Synced version.ts → ${newVersion} (${today})`)
console.log(`\nNext steps:`)
console.log(`  1. Add entry to CHANGELOG.md under [Unreleased]`)
console.log(`  2. Run: npm run version:check`)
console.log(`  3. Commit: git commit -m "chore: bump version to ${newVersion}"`)
