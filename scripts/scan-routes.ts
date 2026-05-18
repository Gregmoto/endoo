/**
 * scripts/scan-routes.ts
 *
 * Scans src/app/api/ recursively, extracts all HTTP method exports, and writes
 * a manifest to tests/_route-manifest.json.
 *
 * Run: tsx scripts/scan-routes.ts
 * Output: tests/_route-manifest.json
 *
 * Categories:
 *   tenant    — uses requireAuth(), data is org-scoped
 *   platform  — super_admin only (src/app/api/platform/)
 *   portal    — portal JWT auth (src/app/api/portal/)
 *   v1        — API key auth (src/app/api/v1/)
 *   public    — no auth (health, version, changelog, register, webhooks)
 *   cron      — internal cron jobs
 */

import fs   from "fs"
import path from "path"

const API_DIR      = path.resolve("src/app/api")
const MANIFEST_OUT = path.resolve("tests/_route-manifest.json")
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

interface RouteEntry {
  path:               string
  file:               string
  methods:            string[]
  category:           "tenant" | "platform" | "portal" | "v1" | "public" | "cron"
  hasDynamicSegments: boolean
  dynamicParams:      string[]
  requiresAuth:       boolean
}

function getCategory(filePath: string): RouteEntry["category"] {
  const rel = filePath.replace(API_DIR, "")
  if (rel.startsWith("/platform/"))        return "platform"
  if (rel.startsWith("/portal/"))          return "portal"
  if (rel.startsWith("/v1/"))              return "v1"
  if (rel.startsWith("/cron/"))            return "cron"
  if (rel.match(/^\/(health|version|changelog|register|webhooks|stripe|auth)\//)) return "public"
  if (rel.match(/^\/(health|version|changelog|register)\/route/))                  return "public"
  return "tenant"
}

function extractDynamicParams(urlPath: string): string[] {
  return [...urlPath.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
}

function fileToUrlPath(filePath: string): string {
  return filePath
    .replace(API_DIR, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\\/g, "/")
    || "/"
}

function walkDir(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full))
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(full)
    }
  }
  return results
}

function extractMethods(content: string): string[] {
  return HTTP_METHODS.filter(m =>
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(content)
  )
}

function hasRequireAuth(content: string): boolean {
  return content.includes("requireAuth") || content.includes("requireSuperAdmin")
}

function run() {
  const files = walkDir(API_DIR).sort()
  const routes: RouteEntry[] = []

  for (const file of files) {
    const content   = fs.readFileSync(file, "utf8")
    const methods   = extractMethods(content)
    if (methods.length === 0) continue

    const urlPath   = fileToUrlPath(file)
    const params    = extractDynamicParams(urlPath)
    const category  = getCategory(file)
    const relFile   = file.replace(path.resolve(".") + "/", "")

    routes.push({
      path:               "/api" + urlPath,
      file:               relFile,
      methods,
      category,
      hasDynamicSegments: params.length > 0,
      dynamicParams:      params,
      requiresAuth:       hasRequireAuth(content),
    })
  }

  const byCategory = routes.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})

  const manifest = {
    generated:   new Date().toISOString(),
    totalRoutes: routes.length,
    byCategory,
    routes,
  }

  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true })
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + "\n")

  console.log(`✅ Route manifest written to ${MANIFEST_OUT}`)
  console.log(`   Total routes : ${routes.length}`)
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`   ${cat.padEnd(10)}: ${count}`)
  }
}

run()
