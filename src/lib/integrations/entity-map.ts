/**
 * ExternalEntityMap helpers.
 *
 * Maps external IDs (e.g. Stripe customer_id) to internal Endoo IDs,
 * with SHA-256 checksum-based change detection to skip unchanged records.
 */

import { prisma }       from "@/lib/prisma"
import { createHash }   from "crypto"
import type { ExternalEntityMap } from "@prisma/client"

export type ExternalType = "contact" | "invoice" | "payment" | "product" | "order"

function sha256(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex")
}

/**
 * Returns the internal entity ID for a given external ID, or null if not yet mapped.
 */
export async function resolveInternalId(
  connectionId:  string,
  externalType:  ExternalType,
  externalId:    string,
): Promise<string | null> {
  const map = await prisma.externalEntityMap.findUnique({
    where: { connectionId_externalType_externalId: { connectionId, externalType, externalId } },
    select: { internalId: true },
  })
  return map?.internalId ?? null
}

/**
 * Upserts a mapping. Returns { changed: true } when the checksum differs from the last sync,
 * meaning the caller should re-process this entity. Returns { changed: false } to skip.
 */
export async function upsertMap(opts: {
  connectionId:   string
  organizationId: string
  externalType:   ExternalType
  internalType?:  string
  externalId:     string
  internalId:     string
  payload:        unknown  // used to compute checksum
}): Promise<{ map: ExternalEntityMap; changed: boolean }> {
  const checksum = sha256(opts.payload)

  const existing = await prisma.externalEntityMap.findUnique({
    where: { connectionId_externalType_externalId: {
      connectionId:  opts.connectionId,
      externalType:  opts.externalType,
      externalId:    opts.externalId,
    }},
  })

  if (existing && existing.checksum === checksum) {
    return { map: existing, changed: false }
  }

  const map = await prisma.externalEntityMap.upsert({
    where: { connectionId_externalType_externalId: {
      connectionId:  opts.connectionId,
      externalType:  opts.externalType,
      externalId:    opts.externalId,
    }},
    create: {
      connectionId:   opts.connectionId,
      organizationId: opts.organizationId,
      externalType:   opts.externalType,
      externalId:     opts.externalId,
      internalType:   opts.internalType ?? "Unknown",
      internalId:     opts.internalId,
      checksum,
      syncedAt:       new Date(),
    },
    update: {
      internalId: opts.internalId,
      checksum,
      syncedAt:   new Date(),
    },
  })

  return { map, changed: true }
}

/**
 * Fetch all maps for a connection and type. Used when bulk-checking what's already imported.
 */
export async function getMapsForConnection(
  connectionId: string,
  externalType: ExternalType,
): Promise<Map<string, string>> {
  const rows = await prisma.externalEntityMap.findMany({
    where:  { connectionId, externalType },
    select: { externalId: true, internalId: true },
  })
  return new Map(rows.map((r) => [r.externalId, r.internalId]))
}
