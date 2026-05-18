/**
 * GET /api/accounting/sru/[id]/download
 *
 * Download the SRU export as a ZIP archive containing INFO.SRU + BLANKETTER.SRU.
 * Falls back to multipart response if JSZip is unavailable.
 *
 * Returns: application/zip  (filename: SRU-{orgNumber}-{taxYear}.zip)
 */

import { NextRequest }         from "next/server"
import { requireAuth }         from "@/lib/rbac/guards"
import { canOrThrow }          from "@/lib/rbac/policy"
import { SRU_EXPORT_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }              from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SRU_EXPORT_PERMISSIONS.READ)

    const { id } = await params

    const record = await prisma.sruExport.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        fiscalYear: { select: { name: true, endDate: true } },
      },
    })

    if (!record) {
      return Response.json({ error: "SRU-export hittades inte" }, { status: 404 })
    }

    const taxYear   = record.fiscalYear.endDate.getFullYear()
    const orgNumber = record.infoSru.match(/#ORGNR (\d+)/)?.[1] ?? "unknown"

    // Build a minimal ZIP in-memory using raw ZIP format (no external dependency)
    const zip = buildZip([
      { name: "INFO.SRU",       content: record.infoSru },
      { name: "BLANKETTER.SRU", content: record.blankettSru },
    ])

    return new Response(zip.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/zip",
        "Content-Disposition": `attachment; filename="SRU-${orgNumber}-${taxYear}.zip"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Okänt fel"
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ─── Minimal ZIP builder ──────────────────────────────────────────────────────
// Implements ZIP local file header + central directory without compression (stored).
// Avoids a dependency on jszip for a simple two-file archive.

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const encoder     = new TextEncoder()
  const localHeaders: Uint8Array[] = []
  const offsets:      number[]     = []
  let   offset = 0

  for (const f of files) {
    const nameBytes    = encoder.encode(f.name)
    const contentBytes = encoder.encode(f.content)
    const crc          = crc32(contentBytes)
    const size         = contentBytes.length

    const local = new Uint8Array(30 + nameBytes.length + size)
    const dv    = new DataView(local.buffer)
    dv.setUint32(0,  0x504b0304, true)  // local file header sig
    dv.setUint16(4,  20, true)           // version needed
    dv.setUint16(6,  0,  true)           // flags
    dv.setUint16(8,  0,  true)           // compression: stored
    dv.setUint16(10, 0,  true)           // last mod time
    dv.setUint16(12, 0,  true)           // last mod date
    dv.setUint32(14, crc,  true)         // CRC-32
    dv.setUint32(18, size, true)         // compressed size
    dv.setUint32(22, size, true)         // uncompressed size
    dv.setUint16(26, nameBytes.length, true)
    dv.setUint16(28, 0, true)            // extra field length
    local.set(nameBytes, 30)
    local.set(contentBytes, 30 + nameBytes.length)

    offsets.push(offset)
    localHeaders.push(local)
    offset += local.length
  }

  const centralDirs: Uint8Array[] = []
  const centralStart = offset

  for (let i = 0; i < files.length; i++) {
    const f         = files[i]
    const nameBytes = encoder.encode(f.name)
    const contentBytes = encoder.encode(f.content)
    const crc  = crc32(contentBytes)
    const size = contentBytes.length

    const cd = new Uint8Array(46 + nameBytes.length)
    const dv = new DataView(cd.buffer)
    dv.setUint32(0,  0x504b0102, true)  // central dir sig
    dv.setUint16(4,  20, true)
    dv.setUint16(6,  20, true)
    dv.setUint16(8,  0,  true)
    dv.setUint16(10, 0,  true)
    dv.setUint16(12, 0,  true)
    dv.setUint16(14, 0,  true)
    dv.setUint32(16, crc,  true)
    dv.setUint32(20, size, true)
    dv.setUint32(24, size, true)
    dv.setUint16(28, nameBytes.length, true)
    dv.setUint16(30, 0, true)
    dv.setUint16(32, 0, true)
    dv.setUint16(34, 0, true)
    dv.setUint16(36, 0, true)
    dv.setUint32(38, 0, true)
    dv.setUint32(42, offsets[i], true)
    cd.set(nameBytes, 46)
    centralDirs.push(cd)
  }

  const centralSize = centralDirs.reduce((s, c) => s + c.length, 0)
  const eocd        = new Uint8Array(22)
  const eocdDv      = new DataView(eocd.buffer)
  eocdDv.setUint32(0,  0x504b0506, true)
  eocdDv.setUint16(4,  0, true)
  eocdDv.setUint16(6,  0, true)
  eocdDv.setUint16(8,  files.length, true)
  eocdDv.setUint16(10, files.length, true)
  eocdDv.setUint32(12, centralSize,   true)
  eocdDv.setUint32(16, centralStart,  true)
  eocdDv.setUint16(20, 0, true)

  const parts    = [...localHeaders, ...centralDirs, eocd]
  const totalLen = parts.reduce((s, p) => s + p.length, 0)
  const result   = new Uint8Array(totalLen)
  let   pos      = 0
  for (const p of parts) { result.set(p, pos); pos += p.length }
  return result
}

// ─── CRC-32 ───────────────────────────────────────────────────────────────────

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
