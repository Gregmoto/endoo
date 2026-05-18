#!/usr/bin/env tsx
/**
 * Validates that package.json, src/lib/version.ts, and CHANGELOG.md are in sync.
 * Run via: npm run version:check
 * Also runs as a pre-commit hook.
 */

import { readFileSync } from "fs"
import { resolve } from "path"

const root = resolve(__dirname, "..")

function fail(msg: string): never {
  console.error(`\n❌ version-check: ${msg}\n`)
  process.exit(1)
}

function ok(msg: string) {
  console.log(`✅ ${msg}`)
}

// ── 1. Read package.json version ──────────────────────────────────
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const pkgVersion: string = pkg.version
if (!pkgVersion) fail("package.json missing 'version' field")

// ── 2. Read APP_VERSION from src/lib/version.ts ───────────────────
const versionTs = readFileSync(resolve(root, "src/lib/version.ts"), "utf8")

const versionMatch = versionTs.match(/export const APP_VERSION\s*=\s*["']([^"']+)["']/)
if (!versionMatch) fail("Could not find APP_VERSION in src/lib/version.ts")
const tsVersion = versionMatch[1]

const dateMatch = versionTs.match(/export const APP_VERSION_DATE\s*=\s*["']([^"']+)["']/)
if (!dateMatch) fail("Could not find APP_VERSION_DATE in src/lib/version.ts")
const tsDate = dateMatch[1]

// ── 3. Validate version sync ──────────────────────────────────────
if (pkgVersion !== tsVersion) {
  fail(
    `Version mismatch!\n  package.json: ${pkgVersion}\n  version.ts:   ${tsVersion}\n\nRun: npm run version:bump:patch`
  )
}
ok(`Version synced: ${pkgVersion}`)

// ── 4. Validate date format ───────────────────────────────────────
if (!/^\d{4}-\d{2}-\d{2}$/.test(tsDate)) {
  fail(`APP_VERSION_DATE "${tsDate}" is not a valid ISO date (YYYY-MM-DD)`)
}
ok(`Release date: ${tsDate}`)

// ── 5. Validate CHANGELOG.md has entry for current version ────────
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8")

// Skip validation for 0.1.0 initial setup — always passes
const isInitial = pkgVersion === "0.1.0"
if (!isInitial) {
  const escapedVersion = pkgVersion.replace(/\./g, "\\.")
  const versionHeader = new RegExp(`^## \\[${escapedVersion}\\]`, "m")
  if (!versionHeader.test(changelog)) {
    fail(
      `CHANGELOG.md has no entry for version ${pkgVersion}.\n\nAdd a section:\n## [${pkgVersion}] - ${tsDate}\n`
    )
  }
  ok(`CHANGELOG.md has entry for ${pkgVersion}`)
} else {
  ok(`CHANGELOG.md check skipped for initial version ${pkgVersion}`)
}

// ── 6. Warn if [Unreleased] contains placeholder text ────────────
const unreleasedMatch = changelog.match(/## \[Unreleased\]([\s\S]*?)(?=## \[|$)/)
if (unreleasedMatch) {
  const body = unreleasedMatch[1]
  if (body.includes("TBD") || body.includes("TODO")) {
    console.warn("⚠️  [Unreleased] contains TBD/TODO — remember to replace before release")
  }
}

console.log("\n✅ version-check passed\n")
