/**
 * GET  /api/supplier-invoices  — list with filters
 * POST /api/supplier-invoices  — upload file, create draft record
 */

import { NextRequest }          from "next/server"
import { requireAuth }          from "@/lib/rbac/guards"
import { canOrThrow }           from "@/lib/rbac/policy"
import { SUPPLIER_INVOICE_PERMISSIONS } from "@/lib/rbac/permissions"
import { prisma }               from "@/lib/prisma"
import { put }                  from "@vercel/blob"

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const MAX_BYTES     = 10 * 1024 * 1024   // 10 MB

// ── GET /api/supplier-invoices ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.READ)

    const sp     = req.nextUrl.searchParams
    const status = sp.get("status") ?? undefined
    const page   = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
    const take   = 25
    const skip   = (page - 1) * take

    const where = {
      organizationId: ctx.organizationId,
      ...(status && { status: status as never }),
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.supplierInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { supplier: { select: { id: true, name: true } } },
      }),
      prisma.supplierInvoice.count({ where }),
    ])

    return Response.json({ invoices, total, pages: Math.ceil(total / take), page })
  } catch (err) {
    return handleError(err)
  }
}

// ── POST /api/supplier-invoices ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, SUPPLIER_INVOICE_PERMISSIONS.UPLOAD)

    const formData = await req.formData()
    const file     = formData.get("file") as File | null

    if (!file)                            return Response.json({ error: "Ingen fil bifogad" },           { status: 400 })
    if (!ACCEPTED_MIME.includes(file.type)) return Response.json({ error: "Filtypen stöds inte" },       { status: 400 })
    if (file.size > MAX_BYTES)            return Response.json({ error: "Filen är för stor (max 10 MB)" }, { status: 400 })

    // Upload to Vercel Blob
    const blob = await put(
      `supplier-invoices/${ctx.organizationId}/${Date.now()}-${file.name}`,
      file,
      { access: "private", contentType: file.type }
    )

    const invoice = await prisma.supplierInvoice.create({
      data: {
        organizationId:  ctx.organizationId,
        fileKey:         blob.url,
        fileName:        file.name,
        fileMimeType:    file.type,
        status:          "draft",
        extractionStatus: "pending",
        createdByUserId: ctx.userId,
      },
    })

    return Response.json({ invoice }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" },  { status: 401 })
    if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },     { status: 403 })
  }
  console.error("[supplier-invoices]", err)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
