import type { AccountingAiContext } from "./types"
import { formatContextForPrompt } from "./accounting-context"

const BASE_SYSTEM = `Du är Endoo AI, en ekonomiassistent specialiserad på svensk bokföring enligt BAS-kontoplanen.

GRUNDREGLER:
- Svara ALLTID på svenska
- Använd ALLTID 4-siffriga BAS-kontonummer
- Returnera ALLTID giltig JSON — inga kommentarer, inga markdown-kodblock
- Momsbelopp i öre (heltal), inga decimaler
- Momssatser: 0.25 (25%), 0.12 (12%), 0.06 (6%), 0 (0%)
- Momskoder: MP1=25%, MP2=12%, MP3=6%, MF=ingående moms
- Leverantörsskulder: alltid konto 2440
- Ingående moms: alltid konto 2640 (25%), 2641 (12%), 2642 (6%)`

// ─── Receipt / invoice extraction ────────────────────────────────────────────

export function buildReceiptScanPrompt(ctx: AccountingAiContext): string {
  return `${BASE_SYSTEM}

Du analyserar en bild av en leverantörsfaktura eller ett kvitto.

${formatContextForPrompt(ctx)}

UPPGIFT: Extrahera all information från bilden och föreslå bokföringskonton.

Returnera ett JSON-objekt med EXAKT denna struktur:
{
  "vendor": "Leverantörens namn eller null",
  "vendorOrgNumber": "556123-4567 eller null",
  "vendorVatNumber": "SE556123456701 eller null",
  "invoiceNumber": "Fakturanummer eller null",
  "invoiceDate": "YYYY-MM-DD eller null",
  "dueDate": "YYYY-MM-DD eller null",
  "currency": "SEK",
  "lines": [
    {
      "description": "Artikelns/tjänstens beskrivning",
      "quantity": 1,
      "unitPrice": 100000,
      "vatRate": 0.25,
      "vatAmount": 25000,
      "total": 125000
    }
  ],
  "subtotalExVat": 100000,
  "vatTotal": 25000,
  "totalInclVat": 125000,
  "suggestedAccounts": [
    {
      "accountNumber": "6110",
      "accountName": "Kontorsmaterial",
      "side": "debit",
      "debit": 100000,
      "credit": 0,
      "vatCode": "MF",
      "description": "Kontorsmaterial",
      "confidence": 0.9,
      "reason": "Förbrukningsinventarier kostnadsförs direkt"
    },
    {
      "accountNumber": "2640",
      "accountName": "Ingående moms",
      "side": "debit",
      "debit": 25000,
      "credit": 0,
      "vatCode": null,
      "description": "Ingående moms 25%",
      "confidence": 1.0,
      "reason": "Standardmomskonto"
    },
    {
      "accountNumber": "2440",
      "accountName": "Leverantörsskulder",
      "side": "credit",
      "debit": 0,
      "credit": 125000,
      "vatCode": null,
      "description": null,
      "confidence": 1.0,
      "reason": "Leverantörsskuld"
    }
  ],
  "confidence": 0.88,
  "extractionNotes": "Eventuell kommentar om osäkerheter eller null"
}`
}

// ─── Account suggestion ───────────────────────────────────────────────────────

export function buildAccountSuggestPrompt(ctx: AccountingAiContext, description: string, amountOre?: number): string {
  const amountStr = amountOre
    ? `Belopp: ${(amountOre / 100).toLocaleString("sv-SE")} kr`
    : ""

  return `${BASE_SYSTEM}

${formatContextForPrompt(ctx)}

UPPGIFT: Föreslå de mest troliga bokföringskontona för följande transaktion.
Beskrivning: "${description}"
${amountStr}

Returnera JSON med EXAKT denna struktur (1–3 förslag, sorterade efter confidence):
{
  "suggestions": [
    {
      "accountNumber": "6110",
      "accountName": "Kontorsmaterial",
      "side": "debit",
      "confidence": 0.92,
      "reason": "Förbrukningsinventarier som kontorspapper och pennor"
    }
  ]
}`
}

// ─── Journal suggestion (full entry for supplier invoice) ─────────────────────

export function buildJournalSuggestPrompt(
  ctx: AccountingAiContext,
  invoice: {
    vendor:        string | null
    description:   string | null
    lines:         { description: string; amount: number; vatRate: number }[]
    totalAmountOre: number
    vatAmountOre:   number
    netAmountOre:   number
  }
): string {
  const lineStr = invoice.lines
    .map(l => `  - ${l.description}: ${(l.amount / 100).toLocaleString("sv-SE")} kr (moms ${Math.round(l.vatRate * 100)}%)`)
    .join("\n")

  return `${BASE_SYSTEM}

${formatContextForPrompt(ctx)}

UPPGIFT: Skapa ett komplett bokföringsförslag (verifikat) för följande leverantörsfaktura.

Leverantör: ${invoice.vendor ?? "Okänd"}
Beskrivning: ${invoice.description ?? "Leverantörsfaktura"}
Rader:
${lineStr || `  - Totalt: ${(invoice.totalAmountOre / 100).toLocaleString("sv-SE")} kr`}

Summering:
  Netto (exkl. moms): ${(invoice.netAmountOre / 100).toLocaleString("sv-SE")} kr
  Moms:               ${(invoice.vatAmountOre / 100).toLocaleString("sv-SE")} kr
  Totalt inkl. moms:  ${(invoice.totalAmountOre / 100).toLocaleString("sv-SE")} kr

Returnera JSON med EXAKT denna struktur:
{
  "entries": [
    {
      "accountNumber": "6230",
      "accountName": "Konsulttjänster",
      "debit": 800000,
      "credit": 0,
      "vatCode": "MF",
      "description": "Konsultarvode"
    },
    {
      "accountNumber": "2640",
      "accountName": "Ingående moms",
      "debit": 200000,
      "credit": 0,
      "vatCode": null,
      "description": "Ingående moms 25%"
    },
    {
      "accountNumber": "2440",
      "accountName": "Leverantörsskulder",
      "debit": 0,
      "credit": 1000000,
      "vatCode": null,
      "description": null
    }
  ],
  "confidence": 0.88,
  "confidenceBreakdown": {
    "vendorKnown": 0.5,
    "accountHistoryMatch": 0.3,
    "descriptionMatch": 0.9,
    "vatRateConsistency": 1.0,
    "amountReasonable": 0.8,
    "modelConfidence": 0.88
  },
  "warnings": [],
  "explanation": "Konsulttjänst bokförs på 6230 med ingående moms 25% på 2640 och leverantörsskuld på 2440."
}

VIKTIGT: Summan av alla debet-poster MÅSTE vara lika med summan av alla kredit-poster. Annars är verifikatet obalanserat.`
}

// ─── Explanation ─────────────────────────────────────────────────────────────

export function buildExplainPrompt(ctx: AccountingAiContext, question: string, accountNumber?: string): string {
  const accountHint = accountNumber
    ? `Specifikt konto att förklara: ${accountNumber}`
    : ""

  return `${BASE_SYSTEM}

${formatContextForPrompt(ctx)}

UPPGIFT: Förklara följande på svenska för en icke-redovisningsutbildad företagare.
${accountHint}
Fråga: "${question}"

Returnera JSON med EXAKT denna struktur:
{
  "explanation": "Tydlig förklaring på 2–4 meningar",
  "relatedAccounts": ["2641", "2645"],
  "examples": [
    "Exempel: Du köper kontorsmaterial för 1 250 kr inkl. 25% moms:\\n  DR 6110 Kontorsmaterial 1 000 kr\\n  DR 2640 Ingående moms 250 kr\\n  KR 1930 Företagskonto 1 250 kr"
  ]
}`
}
