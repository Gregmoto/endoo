import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { SearchEntityType, SearchOptions, SearchResult } from "./types"

interface RawRow {
  id:              string
  organizationid:  string
  entitytype:      string
  entityid:        string
  title:           string
  subtitle:        string | null
  url:             string
  metadata:        unknown
  rank:            number | string
}

function buildTsQuery(q: string): string {
  // Sanitize and split into words, then suffix each with :* for prefix matching
  const words = q
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9åäöéàü]/g, ""))
    .filter(w => w.length >= 2)

  if (words.length === 0) return ""
  return words.map(w => `${w}:*`).join(" & ")
}

export async function searchQuery(opts: SearchOptions): Promise<SearchResult[]> {
  const { organizationId, q, types, limit = 20 } = opts

  const trimmed = q.trim()
  if (!trimmed) return []

  const tsQuery    = buildTsQuery(trimmed)
  const typeFilter = types && types.length > 0 ? types : null
  const results    = new Map<string, SearchResult>()

  // ── Pass 1: PostgreSQL full-text search (prefix matching via :*) ─────────
  if (tsQuery) {
    try {
      const ftRows = await prisma.$queryRaw<RawRow[]>(
        Prisma.sql`
          SELECT
            id,
            organization_id AS organizationid,
            entity_type     AS entitytype,
            entity_id       AS entityid,
            title,
            subtitle,
            url,
            metadata,
            ts_rank(
              to_tsvector('simple', keywords),
              to_tsquery('simple', ${tsQuery})
            ) AS rank
          FROM search_index
          WHERE organization_id = ${organizationId}::uuid
            AND to_tsvector('simple', keywords) @@ to_tsquery('simple', ${tsQuery})
            ${typeFilter ? Prisma.sql`AND entity_type = ANY(${typeFilter}::text[])` : Prisma.empty}
          ORDER BY rank DESC, updated_at DESC
          LIMIT ${limit}
        `,
      )

      for (const row of ftRows) {
        results.set(row.entityid, toResult(row, 1.0))
      }
    } catch (err) {
      // tsQuery may be invalid for very unusual input — fall through to ILIKE
      console.warn("[search] FTS query failed, falling back to ILIKE", err)
    }
  }

  // ── Pass 2: ILIKE fallback — catches numbers, short strings, typos ───────
  if (results.size < 5) {
    const pattern = `%${trimmed.replace(/%/g, "").replace(/_/g, "\\_")}%`

    const ilikeRows = await prisma.$queryRaw<RawRow[]>(
      Prisma.sql`
        SELECT
          id,
          organization_id AS organizationid,
          entity_type     AS entitytype,
          entity_id       AS entityid,
          title,
          subtitle,
          url,
          metadata,
          0.3::float AS rank
        FROM search_index
        WHERE organization_id = ${organizationId}::uuid
          AND keywords ILIKE ${pattern}
          ${typeFilter ? Prisma.sql`AND entity_type = ANY(${typeFilter}::text[])` : Prisma.empty}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `,
    )

    for (const row of ilikeRows) {
      if (!results.has(row.entityid)) {
        results.set(row.entityid, toResult(row, 0.3))
      }
    }
  }

  return Array.from(results.values())
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
}

function toResult(row: RawRow, rankMultiplier: number): SearchResult {
  return {
    id:         row.id,
    entityType: row.entitytype as SearchEntityType,
    entityId:   row.entityid,
    title:      row.title,
    subtitle:   row.subtitle ?? null,
    url:        row.url,
    metadata:   (row.metadata as Record<string, unknown>) ?? {},
    rank:       Number(row.rank) * rankMultiplier,
  }
}
