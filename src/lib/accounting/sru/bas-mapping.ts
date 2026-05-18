// BAS-to-SRU field mapping
//
// OSÄKERHET: Dessa fältnummer är baserade på Skatteverkets SRU-specifikation för
// inkomstår 2025 (deklaration 2026). Verifiera alltid mot Skatteverkets officiella
// blankettspecifikation på skatteverket.se innan inlämning.
// SKV-dokument: "Teknisk beskrivning för SRU-filer" — uppdateras varje taxeringsår.
//
// BAS-kontoplan ref: BAS 2025 (www.bas.se)
// Kontointervall anges som [fromAccount, toAccount] (inklusive).

import type { AccountBalanceRow, AccountRangeSum } from "./types"

// ─── INK2R — Resultaträkning ────────────────────────────────────────────────
//
// OSÄKERHET: Exakta fältnummer för INK2R varierar mellan taxeringsår.
// Nedan är uppskattade värden för taxeringsår 2026 (inkomstår 2025).
// Källa: SKV blankett INK2R-2026, teknisk spec för SRU-lämnare.

export interface Ink2rMapping {
  field: number
  label: string
  /** BAS account number ranges [from, to] (inclusive) */
  accounts: [string, string][]
  /** true = sum debit side; false = sum credit side; "net" = debit - credit */
  side: "debit" | "credit" | "net"
  /** If true, negate the value (expenses are positive in SRU even though credit-heavy) */
  negate?: boolean
}

// OSÄKERHET: Följande fältmappningar är approximationer baserade på
// Skatteverkets blankett INK2R. Verifiera fältnummer mot aktuellt taxeringsår.
export const INK2R_MAPPINGS: Ink2rMapping[] = [
  // ─── Rörelsens intäkter ─────────────────────────────────────────────────
  {
    field: 2510,
    label: "Nettoomsättning",
    // OSÄKERHET: BAS 30xx-37xx är nettoomsättning; 38xx är lager/PIA/FP
    accounts: [["3000", "3799"]],
    side: "net",
    negate: true, // inkomst = kredit i BAS → positivt i INK2R
  },
  {
    field: 2511,
    label: "Förändring av lager av FP, PIA och FVL",
    // OSÄKERHET: BAS 3800-3899 avser lagerförändringar och aktiverade kostnader
    accounts: [["3800", "3869"]],
    side: "net",
    negate: true,
  },
  {
    field: 2512,
    label: "Aktiverat arbete för egen räkning",
    // OSÄKERHET: Fält 2512 kan vara samlat med 2511 i vissa versioner av INK2R
    accounts: [["3870", "3899"]],
    side: "net",
    negate: true,
  },
  {
    field: 2540,
    label: "Övriga rörelseintäkter",
    // OSÄKERHET: BAS 39xx = övriga rörelseintäkter (bl.a. realisationsvinster på tillgångar)
    accounts: [["3900", "3999"]],
    side: "net",
    negate: true,
  },

  // ─── Rörelsens kostnader ─────────────────────────────────────────────────
  {
    field: 2600,
    label: "Råvaror och förnödenheter",
    // OSÄKERHET: BAS 40xx-49xx täcker varuinköp och råvaror. Exakt gräns mot
    // "Handelsvaror" (fält 2601) är branschberoende — K2/K3 har olika uppdelning.
    accounts: [["4000", "4499"]],
    side: "net",
    negate: false, // kostnad = debit i BAS → redan positivt
  },
  {
    field: 2601,
    label: "Handelsvaror",
    // OSÄKERHET: Uppdelning 4000-4499 vs 4500-4999 är osäker — BAS delar inte
    // alltid upp så. Många företag redovisar allt under 4xxx som råvaror/handelsvaror.
    accounts: [["4500", "4999"]],
    side: "net",
    negate: false,
  },
  {
    field: 2620,
    label: "Övriga externa kostnader",
    // OSÄKERHET: BAS 50xx-69xx. Inkluderar lokalkostnader, transportkostnader,
    // kontorskostnader, reklam, IT-kostnader m.m.
    accounts: [["5000", "6999"]],
    side: "net",
    negate: false,
  },
  {
    field: 2630,
    label: "Personalkostnader",
    // OSÄKERHET: BAS 70xx-74xx = löner, sociala avgifter, pensionskostnader.
    // BAS 75xx-79xx exkluderas här (avskrivningar och övriga rörelsekostnader).
    accounts: [["7000", "7499"]],
    side: "net",
    negate: false,
  },
  {
    field: 2640,
    label: "Av- och nedskrivningar av materiella och immateriella anläggningstillgångar",
    // OSÄKERHET: BAS 78xx = avskrivningar. BAS 77xx = nedskrivningar (separat fält 2650).
    accounts: [["7800", "7899"]],
    side: "net",
    negate: false,
  },
  {
    field: 2650,
    label: "Nedskrivningar av omsättningstillgångar",
    // OSÄKERHET: BAS 77xx = nedskrivningar på anläggningstillgångar i vissa tolkningar.
    // Exakt uppdelning mellan 2640 och 2650 kräver verifiering mot blankett.
    accounts: [["7700", "7799"]],
    side: "net",
    negate: false,
  },
  {
    field: 2660,
    label: "Övriga rörelsekostnader",
    // OSÄKERHET: BAS 79xx = övriga rörelsekostnader (förluster vid avyttring av
    // anläggningstillgångar, utrangeringsförluster m.m.)
    accounts: [["7900", "7999"]],
    side: "net",
    negate: false,
  },

  // ─── Finansiella poster ──────────────────────────────────────────────────
  {
    field: 2720,
    label: "Ränteintäkter och liknande resultatposter",
    // OSÄKERHET: BAS 8000-8499 inkluderar finansiella intäkter. Exakt gräns
    // för ränteintäkter vs utdelningar vs valutakursvinster varierar.
    // BAS 83xx = ränteintäkter, BAS 80xx-82xx = utdelningar/andelar.
    // side=net, negate=true: inkomstkonton har credit>debit → net negativ → negate → positiv
    accounts: [["8000", "8399"]],
    side: "net",
    negate: true,
  },
  {
    field: 2750,
    label: "Räntekostnader och liknande resultatposter",
    // OSÄKERHET: BAS 8400-8499 = räntekostnader. Kan överlappa med fält 2720
    // beroende på hur BAS 8000-8499 delas upp.
    accounts: [["8400", "8499"]],
    side: "debit",
    negate: false,
  },
  {
    field: 2900,
    label: "Bokslutsdispositioner",
    // OSÄKERHET: BAS 8800-8899 = bokslutsdispositioner (periodiseringsfond,
    // accelererade avskrivningar m.m.). Netto kan vara pos. eller neg.
    accounts: [["8800", "8899"]],
    side: "net",
    negate: true,
  },
  {
    field: 3000,
    label: "Skatt på årets resultat",
    // OSÄKERHET: BAS 8900-8999 = inkomstskatt och uppskjuten skatt.
    accounts: [["8900", "8999"]],
    side: "net",
    negate: false,
  },
]

// ─── INK2S — Balansräkning ───────────────────────────────────────────────────
//
// OSÄKERHET: Exakta fältnummer för INK2S varierar mellan taxeringsår.
// Källa: SKV blankett INK2S-2026, teknisk spec för SRU-lämnare.

export interface Ink2sMapping {
  field: number
  label: string
  accounts: [string, string][]
  side: "debit" | "credit" | "net"
  negate?: boolean
}

// TILLGÅNGSSIDAN (Debit normal)
export const INK2S_ASSET_MAPPINGS: Ink2sMapping[] = [
  {
    field: 4100,
    label: "Immateriella anläggningstillgångar",
    // OSÄKERHET: BAS 10xx = immateriella tillgångar (patent, licenser, goodwill m.m.)
    accounts: [["1000", "1099"]],
    side: "net",
  },
  {
    field: 4110,
    label: "Byggnader och mark",
    // OSÄKERHET: BAS 11xx = byggnader, BAS 12xx = maskiner och inventarier.
    // INK2S kan ha separata fält för byggnader vs maskiner — verifiera blankett.
    accounts: [["1100", "1199"]],
    side: "net",
  },
  {
    field: 4115,
    label: "Maskiner och andra tekniska anläggningar",
    // OSÄKERHET: Fält 4115 kan saknas i vissa versioner av INK2S.
    accounts: [["1200", "1299"]],
    side: "net",
  },
  {
    field: 4120,
    label: "Finansiella anläggningstillgångar",
    // OSÄKERHET: BAS 13xx-17xx. Kan inkludera andelar, långfristiga fordringar m.m.
    accounts: [["1300", "1399"]],
    side: "net",
  },
  {
    field: 4200,
    label: "Varulager m.m.",
    // OSÄKERHET: BAS 14xx = varulager, råmaterial, PIA, färdiga varor.
    accounts: [["1400", "1499"]],
    side: "net",
  },
  {
    field: 4210,
    label: "Kundfordringar",
    // OSÄKERHET: BAS 1510-1519 = kundfordringar. Övriga kundrelaterade konton kan ingå.
    accounts: [["1500", "1599"]],
    side: "net",
  },
  {
    field: 4220,
    label: "Övriga kortfristiga fordringar",
    // OSÄKERHET: BAS 16xx-17xx och 18xx = kortfristiga fordringar, förskott, förutbetalda kostnader.
    accounts: [["1600", "1899"]],
    side: "net",
  },
  {
    field: 4240,
    label: "Kassa och bank",
    // OSÄKERHET: BAS 19xx = likvida medel (kassa, bank, plusgiro).
    accounts: [["1900", "1999"]],
    side: "net",
  },
]

// SKULDSIDAN (Credit normal)
export const INK2S_LIABILITY_MAPPINGS: Ink2sMapping[] = [
  {
    field: 4300,
    label: "Eget kapital",
    // OSÄKERHET: BAS 20xx = eget kapital. Inkluderar aktiekapital (2081),
    // reservfond (2085), balanserade vinstmedel (2091-2094), årets resultat (2099).
    accounts: [["2000", "2099"]],
    // Credit balances are already positive bigints — no negation needed
    side: "credit",
    negate: false,
  },
  {
    field: 4330,
    label: "Obeskattade reserver",
    // OSÄKERHET: BAS 21xx = obeskattade reserver (periodiseringsfonder, skattemässiga övervärden).
    accounts: [["2100", "2199"]],
    side: "credit",
    negate: true,
  },
  {
    field: 4340,
    label: "Avsättningar",
    // OSÄKERHET: BAS 22xx = avsättningar för pensioner, skatter, övriga avsättningar.
    accounts: [["2200", "2299"]],
    side: "credit",
    negate: true,
  },
  {
    field: 4350,
    label: "Långfristiga skulder",
    // OSÄKERHET: BAS 23xx-24xx = långfristiga skulder (obligationslån, checkkredit, etc.)
    accounts: [["2300", "2499"]],
    side: "credit",
    negate: true,
  },
  {
    field: 4360,
    label: "Kortfristiga skulder",
    // OSÄKERHET: BAS 25xx-29xx = kortfristiga skulder (leverantörsskulder, moms,
    // personalens källskatt, kortfristiga lån, upplupna kostnader m.m.)
    accounts: [["2500", "2999"]],
    side: "credit",
    negate: true,
  },
]

// ─── Helper: sum balances within BAS account ranges ─────────────────────────

export function sumAccountRange(
  balances: AccountBalanceRow[],
  from: string,
  to: string
): { debit: bigint; credit: bigint; net: bigint } {
  let debit  = 0n
  let credit = 0n
  for (const b of balances) {
    const n = b.account.number
    if (n >= from && n <= to) {
      debit  += b.debit
      credit += b.credit
    }
  }
  return { debit, credit, net: debit - credit }
}

/** Convert öre (bigint) → whole kronor (number), rounding towards zero */
export function oreToKronor(ore: bigint): number {
  return Number(ore / 100n)
}

/** Apply mapping to a set of balances, returns value in whole kronor */
export function applyMapping(
  balances: AccountBalanceRow[],
  accounts: [string, string][],
  side: "debit" | "credit" | "net",
  negate = false
): number {
  let totalOre = 0n
  for (const [from, to] of accounts) {
    const s = sumAccountRange(balances, from, to)
    if (side === "debit")  totalOre += s.debit
    if (side === "credit") totalOre += s.credit
    if (side === "net")    totalOre += s.net
  }
  const kronor = oreToKronor(negate ? -totalOre : totalOre)
  return kronor
}
