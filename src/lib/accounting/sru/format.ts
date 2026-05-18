// SRU file generator — Skatteverket electronic filing format
//
// Produces two files:
//   INFO.SRU      — organization identification header
//   BLANKETTER.SRU — blankett data (fältvärden)
//
// OSÄKERHET: SRU-formatet specificeras i "Teknisk beskrivning, SRU-filer" från
// Skatteverket. Versionen nedan är baserad på generell SRU-spec. Verifiera
// exakt syntax mot aktuell teknisk beskrivning för taxeringsåret.
//
// Teckenkodning: SRU-filer ska i moderna versioner levereras i UTF-8.
// OSÄKERHET: Äldre Skatteverket-system accepterade CP437/ISO-8859-1.
// Sedan 2019 rekommenderas UTF-8 men verifiera mot aktuell spec.

import type { SruDocument } from "./types"

// ─── INFO.SRU ────────────────────────────────────────────────────────────────

export function generateInfoSru(doc: SruDocument): string {
  const lines: string[] = []

  // OSÄKERHET: Exakt struktur för INFO.SRU-header — verifiera mot teknisk beskrivning
  lines.push("#DATABESKRIVNING_START")
  lines.push("#PRODUKT SRU")
  // OSÄKERHET: #SKAPAD ska vara datumet filen skapades i formatet YYYYMMDD
  lines.push(`#SKAPAD ${doc.createdDate}`)
  // OSÄKERHET: #SYSTEM kan kräva ett godkänt systemnamn registrerat hos SKV
  lines.push("#SYSTEM Endoo")
  lines.push("#DATABESKRIVNING_SLUT")

  lines.push("#MEDIELEV_START")
  // OSÄKERHET: #ORGNR kräver exakt 10 siffror utan bindestreck
  lines.push(`#ORGNR ${doc.orgNumber}`)
  lines.push(`#NAMN ${doc.companyName}`)
  lines.push("#MEDIELEV_SLUT")

  return lines.join("\r\n") + "\r\n"
}

// ─── BLANKETTER.SRU ──────────────────────────────────────────────────────────

export function generateBlankettSru(doc: SruDocument): string {
  const lines: string[] = []

  for (const blankett of doc.blanketter) {
    lines.push(`#BLANKETT ${blankett.blankett}`)
    // OSÄKERHET: #IDENTITET-formatet är "ORGNR YYYYMMDD" — verifiera datumformat
    lines.push(`#IDENTITET ${doc.orgNumber} ${doc.createdDate}`)

    for (const { field, value } of blankett.fields) {
      // OSÄKERHET: Negativa värden skrivs med minustecken i SRU; bekräfta att
      // SKV accepterar negativa fält för alla fälttyper.
      lines.push(`#FALT ${field} ${value}`)
    }

    lines.push("#BLANKETTSLUT")
    lines.push("")
  }

  // OSÄKERHET: #FIL_SLUT krävs i vissa versioner av SRU-spec
  lines.push("#FIL_SLUT")

  return lines.join("\r\n") + "\r\n"
}

// ─── Org number normalization ─────────────────────────────────────────────────

/**
 * Normalize Swedish org number to exactly 10 digits without dash.
 * Input: "556123-4567" or "5561234567" or "16556123-4567"
 * Output: "5561234567"
 *
 * OSÄKERHET: SRU kräver 10-siffrigt orgnr utan bindestreck och utan lands-prefix (16).
 * Verifiera att SKV inte accepterar 12-siffrigt format med landskod.
 */
export function normalizeOrgNumber(raw: string): string {
  // Remove all non-digits
  const digits = raw.replace(/\D/g, "")
  // Remove Swedish country prefix 16 if 12 digits
  if (digits.length === 12 && digits.startsWith("16")) {
    return digits.slice(2)
  }
  // Already 10 digits
  if (digits.length === 10) return digits
  // Fallback — return as-is (will fail SKV validation; caller must handle)
  return digits
}

/** Format date as YYYYMMDD for SRU files */
export function formatSruDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}
