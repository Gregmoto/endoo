// K3 — BFNAR 2012:1 "Årsredovisning och koncernredovisning"
//
// Genererar SRU-underlag med K3-kontoplansgruppering.
// K3-regelverket har en mer detaljerad resultat- och balansräkning.
//
// OSÄKERHET: K3 som sådant är ett redovisningsregelverk (BFNAR 2012:1), inte
// ett SRU-blankettsformat. K3 tillåter fler valmöjligheter i presentation
// (kostnadsslagsindelad vs funktionsindelad resultaträkning).
//
// OSÄKERHET: Denna modul hanterar enbart kostnadsslagsindelad resultaträkning
// (det vanligaste för svenska AB). Funktionsindelad resultaträkning har andra
// fältmappningar och kräver separat implementation.
//
// Referens: BFN BFNAR 2012:1, RFR 2 (för noterade bolag)

import { generateInk2Sru } from "./ink2"
import type { SruDocument } from "./types"

// K3 uses the same INK2R/INK2S SRU structure as K2 and INK2.
// The difference is accounting policies (component depreciation, financial
// instruments at fair value, etc.) — not the SRU field numbers themselves.
//
// OSÄKERHET: K3-företag kan ha fler poster i balansräkningen (t.ex.
// uppskjuten skatt som skuld 22xx). Kontrollera att BAS-kontona är korrekt
// upplagda för K3 innan SRU-export.
export async function generateK3Sru(
  organizationId: string,
  fiscalYearId:   string
): Promise<SruDocument> {
  return generateInk2Sru(organizationId, fiscalYearId)
}
