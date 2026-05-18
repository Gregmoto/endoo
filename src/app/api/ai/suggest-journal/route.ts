import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { requireFeature } from "@/lib/plans/guard"
import { buildAccountingContext } from "@/lib/ai/accounting-context"
import { buildJournalSuggestPrompt } from "@/lib/ai/prompts"
import { callStructured } from "@/lib/ai/gateway"
import { buildSignals, computeConfidence, formatConfidenceBreakdown } from "@/lib/ai/scorer"
import { prisma } from "@/lib/prisma"
import type { JournalSuggestResult } from "@/lib/ai/types"

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    await requireFeature(ctx.organizationId, "ai_assistant")

    const body = await req.json() as {
      supplierInvoiceId?: string
      // Or raw fields for ad-hoc requests
      vendor?:            string
      description?:       string
      lines?:             { description: string; amount: number; vatRate: number }[]
      totalAmountOre?:    number
      vatAmountOre?:      number
      netAmountOre?:      number
    }

    let invoiceData: {
      vendor:         string | null
      description:    string | null
      lines:          { description: string; amount: number; vatRate: number }[]
      totalAmountOre: number
      vatAmountOre:   number
      netAmountOre:   number
      contactName?:   string
      contactOrgNr?:  string
    }

    if (body.supplierInvoiceId) {
      const inv = await prisma.supplierInvoice.findUnique({
        where:   { id: body.supplierInvoiceId },
        include: { supplier: { select: { name: true, orgNumber: true } } },
      })
      if (!inv || inv.organizationId !== ctx.organizationId) {
        return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
      }

      const totalOre = Number(inv.amountInclVat ?? 0)
      const vatOre   = Number(inv.vatAmount ?? 0)

      // Build a single line from extracted AI data if available
      const aiData = inv.aiExtractedData as Record<string, unknown> | null
      const lines  = Array.isArray(aiData?.lines)
        ? (aiData.lines as { description: string; amount: number; vatRate: number }[])
        : []

      invoiceData = {
        vendor:         inv.supplier?.name ?? inv.supplierName ?? null,
        description:    inv.invoiceNumber ? `Faktura ${inv.invoiceNumber}` : "Leverantörsfaktura",
        lines,
        totalAmountOre: totalOre,
        vatAmountOre:   vatOre,
        netAmountOre:   totalOre - vatOre,
        contactName:    inv.supplier?.name ?? undefined,
        contactOrgNr:   inv.supplier?.orgNumber ?? undefined,
      }
    } else {
      invoiceData = {
        vendor:         body.vendor ?? null,
        description:    body.description ?? null,
        lines:          body.lines ?? [],
        totalAmountOre: body.totalAmountOre ?? 0,
        vatAmountOre:   body.vatAmountOre   ?? 0,
        netAmountOre:   body.netAmountOre   ?? 0,
      }
    }

    const aiCtx = await buildAccountingContext(ctx.organizationId, {
      vendorName:  invoiceData.vendor  ?? undefined,
      vendorOrgNr: invoiceData.contactOrgNr,
      amountOre:   invoiceData.totalAmountOre,
    })

    const systemPrompt = buildJournalSuggestPrompt(aiCtx, invoiceData)

    const result = await callStructured<JournalSuggestResult>({
      organizationId: ctx.organizationId,
      userId:         ctx.userId,
      feature:        "journal_suggest",
      systemPrompt,
      userMessage:    "Skapa ett komplett bokföringsförslag för ovanstående leverantörsfaktura.",
      maxTokens:      2048,
    })

    const suggestion = result.data

    // Compute our own confidence on top of the model's
    const signals  = buildSignals({
      vendorHistory:     aiCtx.vendorHistory,
      amountOre:         invoiceData.totalAmountOre,
      modelConfidence:   suggestion.confidence,
      suggestedAccounts: suggestion.entries.map(e => e.accountNumber),
    })
    const confidence = computeConfidence(signals)
    const breakdown  = formatConfidenceBreakdown(signals)

    // Persist
    const saved = await prisma.aiSuggestion.create({
      data: {
        organizationId:      ctx.organizationId,
        createdByUserId:     ctx.userId,
        feature:             "journal_suggest",
        sourceType:          body.supplierInvoiceId ? "supplier_invoice" : "manual",
        sourceId:            body.supplierInvoiceId ?? null,
        suggestion:          suggestion as object,
        confidence,
        confidenceBreakdown: breakdown,
        modelId:             "claude-sonnet-4-6",
        promptTokens:        result.promptTokens,
        completionTokens:    result.completionTokens,
        latencyMs:           result.latencyMs,
        expiresAt:           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return Response.json({
      suggestionId:        saved.id,
      entries:             suggestion.entries,
      confidence,
      confidenceBreakdown: breakdown,
      warnings:            suggestion.warnings,
      explanation:         suggestion.explanation,
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated")
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[ai/suggest-journal]", err)
    return Response.json({ error: "Konteringsförslag misslyckades" }, { status: 500 })
  }
}
