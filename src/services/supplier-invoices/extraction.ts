/**
 * AI extraction service — Claude Vision → structured SupplierInvoice fields
 *
 * Idempotency:
 *   Before calling Claude, we atomically set extractionIdempotencyKey on the row.
 *   If the key already exists (UNIQUE constraint), the second caller gets a conflict
 *   and returns the already-extracted data instead of calling Claude again.
 *
 * Versioning:
 *   aiModel, aiVersion, aiPromptVersion are stored so we can re-process old
 *   invoices when the model or prompt improves and compare results.
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

const PROMPT_VERSION = "v1"
const MODEL          = "claude-sonnet-4-6"

const client = new Anthropic()

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractedInvoiceData = {
  supplierName?:      string | null
  supplierOrgNumber?: string | null
  supplierVatNumber?: string | null
  invoiceNumber?:     string | null
  ocrNumber?:         string | null
  invoiceDate?:       string | null   // YYYY-MM-DD
  dueDate?:           string | null   // YYYY-MM-DD
  bankgiro?:          string | null
  plusgiro?:          string | null
  iban?:              string | null
  currency?:          string | null
  amountExclVat?:     number | null   // SEK
  vatAmount?:         number | null   // SEK
  amountInclVat?:     number | null   // SEK
  vatRate?:           number | null   // 0.25 | 0.12 | 0.06
  confidence: Record<string, number>
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Du är expert på svenska leverantörsfakturor.
Extrahera fälten nedan från fakturan och returnera ENBART giltig JSON — ingen text utanför JSON.

Returnera detta schema exakt:
{
  "supplierName":      string | null,
  "supplierOrgNumber": string | null,
  "supplierVatNumber": string | null,
  "invoiceNumber":     string | null,
  "ocrNumber":         string | null,
  "invoiceDate":       "YYYY-MM-DD" | null,
  "dueDate":           "YYYY-MM-DD" | null,
  "bankgiro":          string | null,
  "plusgiro":          string | null,
  "iban":              string | null,
  "currency":          "SEK" | "EUR" | "USD" | "NOK" | "DKK" | "GBP" | null,
  "amountExclVat":     number | null,
  "vatAmount":         number | null,
  "amountInclVat":     number | null,
  "vatRate":           0.25 | 0.12 | 0.06 | 0 | null,
  "confidence": {
    "supplierName":      number,
    "supplierOrgNumber": number,
    "invoiceNumber":     number,
    "ocrNumber":         number,
    "invoiceDate":       number,
    "dueDate":           number,
    "bankgiro":          number,
    "amountInclVat":     number,
    "vatAmount":         number
  }
}

Regler:
- Alla belopp i originalvalutan (siffror med decimaler, INTE formaterade strängar)
- Organisationsnummer: format 556000-0000 (med bindestreck)
- OCR-nummer: enbart siffror (kan ha # som avgränsare — ta med hela strängen)
- Bankgiro: format XXXX-XXXX
- Confidence 0.0–1.0 per fält (1.0 = helt säker, 0.0 = gissar)
- Returnera null för fält du inte hittar`

// ─── Main extraction function ─────────────────────────────────────────────────

export async function extractSupplierInvoice(
  organizationId: string,
  invoiceId:      string
): Promise<ExtractedInvoiceData> {
  // ── Idempotency: claim this extraction atomically ─────────────────────────
  const idempotencyKey = randomUUID()

  const claimed = await prisma.supplierInvoice.updateMany({
    where: {
      id:                       invoiceId,
      organizationId,
      extractionIdempotencyKey: null,
      extractionStatus:         { in: ["pending", "failed"] },
    },
    data: {
      extractionIdempotencyKey: idempotencyKey,
      extractionStatus:         "processing",
      status:                   "extracting",
    },
  })

  if (claimed.count === 0) {
    // Already claimed → extraction in progress or done
    const current = await prisma.supplierInvoice.findUnique({
      where:  { id: invoiceId },
      select: { extractionStatus: true, aiExtractedData: true },
    })
    if (current?.extractionStatus === "completed" && current.aiExtractedData) {
      return current.aiExtractedData as ExtractedInvoiceData
    }
    throw new Error("extraction_in_progress: another extraction is already running")
  }

  // ── Fetch file ────────────────────────────────────────────────────────────
  const invoice = await prisma.supplierInvoice.findUnique({
    where:  { id: invoiceId },
    select: { fileKey: true, fileMimeType: true },
  })
  if (!invoice) throw new Error("Invoice not found")

  // ── Fetch file content from Vercel Blob ───────────────────────────────────
  const fileRes  = await fetch(invoice.fileKey)
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`)
  const fileBuffer = await fileRes.arrayBuffer()
  const base64     = Buffer.from(fileBuffer).toString("base64")

  // ── Build Claude message ──────────────────────────────────────────────────
  const isPdf = invoice.fileMimeType === "application/pdf"

  const contentBlock = isPdf
    ? ({
        type:   "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as const)
    : ({
        type:   "image",
        source: {
          type:       "base64",
          media_type: invoice.fileMimeType as "image/jpeg" | "image/png" | "image/webp",
          data:       base64,
        },
      } as const)

  // ── Call Claude ───────────────────────────────────────────────────────────
  let extracted: ExtractedInvoiceData
  let rawText:   string

  try {
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      messages: [
        {
          role:    "user",
          content: [
            contentBlock,
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    })

    rawText  = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Claude returned no JSON")
    extracted = JSON.parse(jsonMatch[0]) as ExtractedInvoiceData
  } catch (err) {
    await prisma.supplierInvoice.update({
      where: { id: invoiceId },
      data:  { extractionStatus: "failed", extractionIdempotencyKey: null },
    })
    throw err
  }

  // ── Convert amounts to BigInt öre and persist ─────────────────────────────
  const toOre = (v: number | null | undefined): bigint | null =>
    v != null ? BigInt(Math.round(v * 100)) : null

  await prisma.supplierInvoice.update({
    where: { id: invoiceId },
    data:  {
      extractionStatus:   "completed",
      status:             "needs_review",
      aiModel:            MODEL,
      aiPromptVersion:    PROMPT_VERSION,
      aiProcessedAt:      new Date(),
      ocrRawText:         rawText,
      aiExtractedData:    extracted as object,
      aiConfidence:       extracted.confidence as object,

      // Pre-fill verified fields from extraction
      supplierName:      extracted.supplierName      ?? null,
      supplierOrgNumber: extracted.supplierOrgNumber ?? null,
      supplierVatNumber: extracted.supplierVatNumber ?? null,
      invoiceNumber:     extracted.invoiceNumber     ?? null,
      ocrNumber:         extracted.ocrNumber         ?? null,
      invoiceDate:       extracted.invoiceDate       ? new Date(extracted.invoiceDate) : null,
      dueDate:           extracted.dueDate           ? new Date(extracted.dueDate)     : null,
      bankgiro:          extracted.bankgiro          ?? null,
      plusgiro:          extracted.plusgiro          ?? null,
      iban:              extracted.iban              ?? null,
      currency:          extracted.currency          ?? "SEK",
      amountExclVat:     toOre(extracted.amountExclVat),
      vatAmount:         toOre(extracted.vatAmount),
      amountInclVat:     toOre(extracted.amountInclVat),
      vatRate:           extracted.vatRate           ?? null,
    },
  })

  // ── Auto-match supplier ───────────────────────────────────────────────────
  if (extracted.supplierOrgNumber) {
    const supplier = await prisma.supplier.findFirst({
      where: { organizationId, orgNumber: extracted.supplierOrgNumber, isActive: true },
    })
    if (supplier) {
      await prisma.supplierInvoice.update({
        where: { id: invoiceId },
        data:  { supplierId: supplier.id },
      })
    }
  }

  return extracted
}
