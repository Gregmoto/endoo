import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { buildAccountingContext } from "@/lib/ai/accounting-context"
import { buildReceiptScanPrompt } from "@/lib/ai/prompts"
import { callVision } from "@/lib/ai/gateway"
import { buildSignals, computeConfidence, formatConfidenceBreakdown } from "@/lib/ai/scorer"
import { prisma } from "@/lib/prisma"
import type { ExtractedInvoice } from "@/lib/ai/types"

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"] as const
type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

const MIME_MAP: Record<string, MediaType> = {
  "image/jpeg": "image/jpeg",
  "image/jpg":  "image/jpeg",
  "image/png":  "image/png",
  "image/webp": "image/webp",
  "image/gif":  "image/gif",
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "Ingen fil bifogad" }, { status: 400 })
    }

    const mimeType = file.type.toLowerCase()
    if (!ALLOWED_TYPES.some(t => t === mimeType)) {
      return Response.json({ error: "Filtyp stöds ej — använd JPEG, PNG, WebP eller GIF" }, { status: 400 })
    }

    const mediaType = MIME_MAP[mimeType]
    if (!mediaType) {
      return Response.json({ error: "Okänd filtyp" }, { status: 400 })
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    // Build AI context (no vendor known yet)
    const aiCtx = await buildAccountingContext(ctx.organizationId)
    const systemPrompt = buildReceiptScanPrompt(aiCtx)

    const result = await callVision<ExtractedInvoice>({
      organizationId: ctx.organizationId,
      userId:         ctx.userId,
      feature:        "receipt_scan",
      systemPrompt,
      textPrompt:     "Analysera denna faktura/kvitto och returnera JSON enligt instruktionerna i system-prompten.",
      imageBase64:    base64,
      mediaType,
      maxTokens:      2048,
    })

    const extracted = result.data

    // Compute confidence using signals
    const signals = buildSignals({
      vendorHistory:   null,
      amountOre:       extracted.totalInclVat,
      modelConfidence: extracted.confidence,
      suggestedAccounts: extracted.suggestedAccounts.map(a => a.accountNumber),
    })
    const confidence = computeConfidence(signals)
    const breakdown  = formatConfidenceBreakdown(signals)

    // Persist AiSuggestion
    const suggestion = await prisma.aiSuggestion.create({
      data: {
        organizationId:   ctx.organizationId,
        createdByUserId:  ctx.userId,
        feature:          "receipt_scan",
        sourceType:       "receipt",
        suggestion:       extracted as object,
        confidence,
        confidenceBreakdown: breakdown,
        modelId:          "claude-sonnet-4-6",
        promptTokens:     result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs:        result.latencyMs,
        expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return Response.json({
      suggestionId: suggestion.id,
      ...extracted,
      confidence,
      confidenceBreakdown: breakdown,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[receipts/scan]", err)
    return Response.json({ error: "Skanningen misslyckades" }, { status: 500 })
  }
}
