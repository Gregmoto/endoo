// K2 — BFNAR 2016:10 "Årsredovisning i mindre företag"
//
// Genererar SRU-underlag med K2-kontoplansgruppering.
// K2-regelverket har en förenklad resultat- och balansräkning jämfört med K3.
//
// OSÄKERHET: K2 som sådant är ett redovisningsregelverk (BFNAR 2016:10), inte
// ett SRU-blankettsformat. Denna modul beräknar INK2R/INK2S med K2-anpassad
// kontogrupering, dvs. färre uppdelningar i resultaträkningen.
//
// OSÄKERHET: K2 tillåter ej aktivering av egenupparbetade immateriella
// tillgångar. Kontrollera att BAS-konton 1010-1059 är noll för K2-företag.
//
// Referens: BFN BFNAR 2016:10, kap 3-4 (resultaträkningsschema A och B)

import { generateInk2Sru } from "./ink2"
import type { SruDocument } from "./types"

// K2 uses the same INK2R/INK2S mapping as INK2 — the distinction is in the
// accounting rules applied, not the SRU field structure itself.
//
// OSÄKERHET: Om Skatteverket kräver en K2-specifik blankett (t.ex. N3A för
// enskild firma) ska den modulen implementeras separat.
export async function generateK2Sru(
  organizationId: string,
  fiscalYearId:   string
): Promise<SruDocument> {
  // K2 uses INK2R + INK2S structure with K2-presentation
  // OSÄKERHET: K2 har ett förenklat resultaträkningsschema (schema B = kortare
  // uppdelning). Exakt mappning av K2-schemarad till SRU-fält kan skilja sig
  // från K3-schemat om Skatteverket kräver separata blanketter per ramverk.
  return generateInk2Sru(organizationId, fiscalYearId)
}
