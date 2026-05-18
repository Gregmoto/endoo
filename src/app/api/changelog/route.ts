import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"
import { APP_VERSION } from "@/lib/version"

export const dynamic = "force-dynamic"
export const revalidate = 3600

interface VersionEntry {
  version: string
  releasedAt: string
  isCurrent: boolean
  categories: Record<string, string[]>
}

function parseChangelog(): VersionEntry[] {
  try {
    const raw = readFileSync(resolve(process.cwd(), "CHANGELOG.md"), "utf8")
    const versions: VersionEntry[] = []

    // Split on version headers — ## [x.y.z] or ## [Unreleased]
    const sections = raw.split(/\n(?=## \[)/)

    for (const section of sections) {
      const headerMatch = section.match(/^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/)
      if (!headerMatch) continue

      const version = headerMatch[1]
      const releasedAt = headerMatch[2] ?? null

      if (version === "Unreleased") continue

      const categories: Record<string, string[]> = {}

      // Find category blocks: ### Category
      const categoryBlocks = section.split(/\n(?=### )/)
      for (const block of categoryBlocks) {
        const catMatch = block.match(/^### (.+)/)
        if (!catMatch) continue
        const category = catMatch[1].trim()
        const items = block
          .split("\n")
          .slice(1)
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.replace(/^-\s*/, "").trim())
          .filter(Boolean)
        if (items.length > 0) categories[category] = items
      }

      versions.push({
        version,
        releasedAt: releasedAt ?? "",
        isCurrent: version === APP_VERSION,
        categories,
      })
    }

    return versions
  } catch {
    return []
  }
}

export async function GET() {
  const versions = parseChangelog()
  return NextResponse.json({ versions })
}
