/**
 * Swedish BAS 2024 — Standard Chart of Accounts
 *
 * ~100 key accounts covering the full range of a Swedish SME.
 * Source: BAS-kontogruppen (baskontoplan.se), BAS 2024 edition.
 *
 * Seeded for every new organization with isSystem=true.
 * System accounts: name/description editable, number/type/normalSide NOT.
 *
 * Structure:
 *   level 1 = class    (1000 Tillgångar)
 *   level 2 = group    (1500 Kundfordringar och andra kortfristiga fordringar)
 *   level 3 = account  (1510 Kundfordringar)
 *
 * VAT codes (momskoder):
 *   MP1 = 25%  standard
 *   MP2 = 12%  livsmedel, hotell
 *   MP3 = 6%   böcker, kultur, persontransport
 *   MF  = momsfri
 *   null = inte momsbärande (balanskonton, löner etc.)
 */

import type { AccountType, NormalSide, ReportClass } from "@prisma/client"

export type BasAccountTemplate = {
  number:          string
  name:            string
  type:            AccountType
  normalSide:      NormalSide
  reportClass:     ReportClass
  reportSection:   string
  reportSubsection?: string
  vatCode?:        string
  parentNumber?:   string
  level:           1 | 2 | 3
  sortOrder:       number
  isSystem:        boolean
  allowManualEntry: boolean
  description?:   string
}

// ─── Helper builders ──────────────────────────────────────────────────────────

const asset = (
  number: string, name: string,
  opts: Partial<BasAccountTemplate> = {}
): BasAccountTemplate => ({
  number, name,
  type:        "asset",
  normalSide:  "debit",
  reportClass: "balance_sheet",
  reportSection: opts.reportSection ?? "Tillgångar",
  level:       3,
  sortOrder:   parseInt(number),
  isSystem:    true,
  allowManualEntry: true,
  ...opts,
})

const liability = (
  number: string, name: string,
  opts: Partial<BasAccountTemplate> = {}
): BasAccountTemplate => ({
  number, name,
  type:        "liability",
  normalSide:  "credit",
  reportClass: "balance_sheet",
  reportSection: opts.reportSection ?? "Skulder och eget kapital",
  level:       3,
  sortOrder:   parseInt(number),
  isSystem:    true,
  allowManualEntry: true,
  ...opts,
})

const equity = (
  number: string, name: string,
  opts: Partial<BasAccountTemplate> = {}
): BasAccountTemplate => ({
  number, name,
  type:        "equity",
  normalSide:  "credit",
  reportClass: "balance_sheet",
  reportSection: opts.reportSection ?? "Eget kapital",
  level:       3,
  sortOrder:   parseInt(number),
  isSystem:    true,
  allowManualEntry: true,
  ...opts,
})

const income = (
  number: string, name: string,
  opts: Partial<BasAccountTemplate> = {}
): BasAccountTemplate => ({
  number, name,
  type:        "income",
  normalSide:  "credit",
  reportClass: "income_statement",
  reportSection: opts.reportSection ?? "Rörelsens intäkter",
  level:       3,
  sortOrder:   parseInt(number),
  isSystem:    true,
  allowManualEntry: true,
  ...opts,
})

const expense = (
  number: string, name: string,
  opts: Partial<BasAccountTemplate> = {}
): BasAccountTemplate => ({
  number, name,
  type:        "expense",
  normalSide:  "debit",
  reportClass: "income_statement",
  reportSection: opts.reportSection ?? "Rörelsens kostnader",
  level:       3,
  sortOrder:   parseInt(number),
  isSystem:    true,
  allowManualEntry: true,
  ...opts,
})

const group = (
  number: string, name: string,
  type: AccountType, normalSide: NormalSide,
  reportClass: ReportClass, reportSection: string,
  sortOrder: number
): BasAccountTemplate => ({
  number, name, type, normalSide, reportClass, reportSection,
  level: 2, sortOrder, isSystem: true, allowManualEntry: false,
})

const cls = (
  number: string, name: string,
  type: AccountType, normalSide: NormalSide,
  reportClass: ReportClass, reportSection: string,
  sortOrder: number
): BasAccountTemplate => ({
  number, name, type, normalSide, reportClass, reportSection,
  level: 1, sortOrder, isSystem: true, allowManualEntry: false,
})

// ─── BAS 2024 — Full seed ─────────────────────────────────────────────────────

export const BAS_ACCOUNTS: BasAccountTemplate[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 1 — TILLGÅNGAR
  // ══════════════════════════════════════════════════════════════════════════

  cls("1000", "Tillgångar", "asset", "debit", "balance_sheet", "Tillgångar", 1000),

  // ── 1000–1099 Immateriella anläggningstillgångar ─────────────────────────
  group("1000", "Immateriella anläggningstillgångar", "asset", "debit", "balance_sheet", "Anläggningstillgångar", 1000),
  asset("1010", "Balanserade utgifter för FoU", { parentNumber: "1000", reportSection: "Anläggningstillgångar", description: "Aktiverade utgifter för forskning och utveckling" }),
  asset("1020", "Koncessioner m.m.", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1030", "Patent", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1040", "Licenser", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1060", "Hyresrätter och liknande", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1070", "Goodwill", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1090", "Ackumulerade avskrivningar på immateriella tillgångar", { parentNumber: "1000", reportSection: "Anläggningstillgångar", allowManualEntry: false, description: "Reduceras vid avskrivning (CR)" }),

  // ── 1100–1199 Byggnader och mark ─────────────────────────────────────────
  group("1100", "Byggnader och mark", "asset", "debit", "balance_sheet", "Anläggningstillgångar", 1100),
  asset("1110", "Byggnader", { parentNumber: "1100", reportSection: "Anläggningstillgångar" }),
  asset("1119", "Ackumulerade avskrivningar på byggnader", { parentNumber: "1100", reportSection: "Anläggningstillgångar", allowManualEntry: false }),
  asset("1130", "Mark", { parentNumber: "1100", reportSection: "Anläggningstillgångar", description: "Avskrivs inte" }),
  asset("1150", "Markanläggningar", { parentNumber: "1100", reportSection: "Anläggningstillgångar" }),

  // ── 1200–1299 Maskiner och inventarier ───────────────────────────────────
  group("1200", "Maskiner och inventarier", "asset", "debit", "balance_sheet", "Anläggningstillgångar", 1200),
  asset("1210", "Maskiner och andra tekniska anläggningar", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1220", "Inventarier och verktyg", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1229", "Ackumulerade avskrivningar på inventarier", { parentNumber: "1200", reportSection: "Anläggningstillgångar", allowManualEntry: false }),
  asset("1230", "Datorer", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1239", "Ackumulerade avskrivningar på datorer", { parentNumber: "1200", reportSection: "Anläggningstillgångar", allowManualEntry: false }),
  asset("1250", "Bilar och andra transportmedel", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),

  // ── 1300–1399 Finansiella anläggningstillgångar ──────────────────────────
  group("1300", "Finansiella anläggningstillgångar", "asset", "debit", "balance_sheet", "Anläggningstillgångar", 1300),
  asset("1310", "Andelar i koncernföretag", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1330", "Andelar i intresseföretag", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1380", "Andra långfristiga fordringar", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),

  // ── 1400–1499 Varulager m.m. ─────────────────────────────────────────────
  group("1400", "Varulager m.m.", "asset", "debit", "balance_sheet", "Omsättningstillgångar", 1400),
  asset("1410", "Lager av råvaror och förnödenheter", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1440", "Produkter i arbete", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1460", "Lager av färdiga varor", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),

  // ── 1500–1599 Kundfordringar ─────────────────────────────────────────────
  group("1500", "Kundfordringar och andra kortfristiga fordringar", "asset", "debit", "balance_sheet", "Omsättningstillgångar", 1500),
  asset("1510", "Kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar", description: "Fordringar på kunder för sålda varor/tjänster" }),
  asset("1515", "Osäkra kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1516", "Befarade förluster på kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1520", "Växelfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),

  // ── 1600–1699 Skattefordringar ───────────────────────────────────────────
  group("1600", "Skattefordringar och övriga kortfristiga fordringar", "asset", "debit", "balance_sheet", "Omsättningstillgångar", 1600),
  asset("1630", "Avräkning för skatter och avgifter", { parentNumber: "1600", reportSection: "Omsättningstillgångar", allowManualEntry: false }),
  asset("1650", "Momsfordran", { parentNumber: "1600", reportSection: "Omsättningstillgångar", description: "Ingående moms överstiger utgående moms" }),
  asset("1660", "Fordran på moderbolag", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),

  // ── 1700–1799 Förutbetalda kostnader ────────────────────────────────────
  group("1700", "Förutbetalda kostnader och upplupna intäkter", "asset", "debit", "balance_sheet", "Omsättningstillgångar", 1700),
  asset("1710", "Förutbetalda hyreskostnader", { parentNumber: "1700", reportSection: "Omsättningstillgångar" }),
  asset("1720", "Förutbetalda försäkringspremier", { parentNumber: "1700", reportSection: "Omsättningstillgångar" }),
  asset("1790", "Övriga förutbetalda kostnader och upplupna intäkter", { parentNumber: "1700", reportSection: "Omsättningstillgångar" }),

  // ── 1900–1999 Kassa och bank ─────────────────────────────────────────────
  group("1900", "Kassa och bank", "asset", "debit", "balance_sheet", "Omsättningstillgångar", 1900),
  asset("1910", "Kassa", { parentNumber: "1900", reportSection: "Omsättningstillgångar", description: "Kontanter" }),
  asset("1920", "PlusGiro", { parentNumber: "1900", reportSection: "Omsättningstillgångar" }),
  asset("1930", "Företagskonto / affärskonto", { parentNumber: "1900", reportSection: "Omsättningstillgångar", description: "Huvudbankskonto" }),
  asset("1940", "Bankkonto i utländsk valuta", { parentNumber: "1900", reportSection: "Omsättningstillgångar" }),
  asset("1960", "Upplånat kapital — checkräkningskredit", { parentNumber: "1900", reportSection: "Omsättningstillgångar", description: "Kreditbelopp utnyttjat" }),

  // ── Klass 1 — tillägg ────────────────────────────────────────────────────
  asset("1011", "Balanserade utgifter för FoU, ackumulerade avskrivningar", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1012", "Balanserade utgifter för FoU, ackumulerade nedskrivningar", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1018", "Pågående projekt, immateriella tillgångar", { parentNumber: "1000", reportSection: "Anläggningstillgångar" }),
  asset("1038", "Ackumulerade avskrivningar, patent", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1039", "Ackumulerade nedskrivningar, patent", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1069", "Ackumulerade avskrivningar, hyresrätter", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1078", "Ackumulerade avskrivningar, goodwill", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1079", "Ackumulerade nedskrivningar, goodwill", { parentNumber: "1000", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1111", "Byggnader på annans mark", { parentNumber: "1100", reportSection: "Anläggningstillgångar" }),
  asset("1120", "Markanläggningar", { parentNumber: "1100", reportSection: "Anläggningstillgångar" }),
  asset("1129", "Ackumulerade avskrivningar, markanläggningar", { parentNumber: "1100", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1180", "Pågående nyanläggning, byggnader", { parentNumber: "1100", reportSection: "Anläggningstillgångar" }),
  asset("1211", "Maskiner", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1219", "Ackumulerade avskrivningar, maskiner", { parentNumber: "1200", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1240", "Bilar och transportmedel", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1249", "Ackumulerade avskrivningar, bilar", { parentNumber: "1200", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1259", "Ackumulerade avskrivningar, förbättringsutgifter", { parentNumber: "1200", reportSection: "Anläggningstillgångar", normalSide: "credit" }),
  asset("1280", "Pågående nyanläggning, maskiner", { parentNumber: "1200", reportSection: "Anläggningstillgångar" }),
  asset("1311", "Aktier i dotterbolag", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1320", "Andra långfristiga värdepappersinnehav", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1340", "Ägarintressen i övriga företag", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1350", "Andra långfristiga fordringar", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1381", "Depositionsfordringar", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1382", "Lån till delägare eller närstående", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1390", "Uppskjutna skattefordringar", { parentNumber: "1300", reportSection: "Anläggningstillgångar" }),
  asset("1411", "Råvaror", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1412", "Tillsatsmaterial", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1420", "Lager av varor under tillverkning", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1430", "Lager av färdiga egentillverkade varor", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1441", "Handelslager", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1470", "Förskott till leverantörer", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1480", "Pågående arbeten", { parentNumber: "1400", reportSection: "Omsättningstillgångar" }),
  asset("1511", "Kundfordringar, fakturerade", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1512", "Kundfordringar hos koncernföretag", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1513", "Osäkra kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1514", "Konstaterade osäkra kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1519", "Nedskrivning av kundfordringar", { parentNumber: "1500", reportSection: "Omsättningstillgångar", normalSide: "credit" }),
  asset("1530", "Fordringar hos intresseföretag", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1540", "Fordringar hos övriga närstående", { parentNumber: "1500", reportSection: "Omsättningstillgångar" }),
  asset("1560", "Momsfordran (kortfristig)", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1570", "Övriga kortfristiga fordringar", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1580", "Derivat och andra finansiella instrument", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1590", "Upparbetad men ej fakturerad inkomst", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1610", "Förutbetalda hyreskostnader", { parentNumber: "1700", reportSection: "Omsättningstillgångar" }),
  asset("1620", "Förutbetalda försäkringspremier", { parentNumber: "1700", reportSection: "Omsättningstillgångar" }),
  asset("1640", "Skattefordringar", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1670", "Fordringar hos anställda", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  asset("1680", "Diverse kortfristiga fordringar", { parentNumber: "1600", reportSection: "Omsättningstillgångar" }),
  liability("1980", "Utnyttjad checkräkningskredit", { reportSection: "Kortfristiga skulder" }),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 2 — EGET KAPITAL, AVSÄTTNINGAR OCH SKULDER
  // ══════════════════════════════════════════════════════════════════════════

  cls("2000", "Eget kapital, avsättningar och skulder", "liability", "credit", "balance_sheet", "Skulder och eget kapital", 2000),

  // ── 2000–2099 Eget kapital ───────────────────────────────────────────────
  group("2000", "Eget kapital", "equity", "credit", "balance_sheet", "Eget kapital", 2000),
  equity("2010", "Aktiekapital", { parentNumber: "2000", reportSection: "Eget kapital", allowManualEntry: false, description: "Registrerat aktiekapital (AB). Eget kapital för enskild firma." }),
  equity("2020", "Överkursfond", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2030", "Uppskrivningsfond", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2040", "Reservfond", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2060", "Balanserat resultat", { parentNumber: "2000", reportSection: "Eget kapital", description: "Ackumulerat resultat från tidigare år" }),
  equity("2069", "Årets resultat", { parentNumber: "2000", reportSection: "Eget kapital", allowManualEntry: false, description: "Beräknas automatiskt: intäkter − kostnader" }),

  // ── 2100–2199 Obeskattade reserver ──────────────────────────────────────
  group("2100", "Obeskattade reserver", "liability", "credit", "balance_sheet", "Obeskattade reserver", 2100),
  liability("2110", "Periodiseringsfond", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2150", "Ackumulerade överavskrivningar", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),

  // ── 2200–2299 Avsättningar ───────────────────────────────────────────────
  group("2200", "Avsättningar", "liability", "credit", "balance_sheet", "Avsättningar", 2200),
  liability("2210", "Avsättningar för pensioner", { parentNumber: "2200", reportSection: "Avsättningar" }),
  liability("2290", "Övriga avsättningar", { parentNumber: "2200", reportSection: "Avsättningar" }),

  // ── 2350–2399 Långfristiga skulder ──────────────────────────────────────
  group("2350", "Långfristiga skulder", "liability", "credit", "balance_sheet", "Långfristiga skulder", 2350),
  liability("2350", "Checkräkningskredit", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2360", "Långfristiga skulder till kreditinstitut", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2390", "Övriga långfristiga skulder", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),

  // ── 2400–2499 Leverantörsskulder ────────────────────────────────────────
  group("2400", "Leverantörsskulder och andra kortfristiga skulder", "liability", "credit", "balance_sheet", "Kortfristiga skulder", 2400),
  liability("2440", "Leverantörsskulder", { parentNumber: "2400", reportSection: "Kortfristiga skulder", description: "Skulder till leverantörer" }),
  liability("2450", "Fakturor under behandling", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),

  // ── 2500–2599 Skatteskulder ──────────────────────────────────────────────
  group("2500", "Skatteskulder", "liability", "credit", "balance_sheet", "Kortfristiga skulder", 2500),
  liability("2510", "Skattekonto", { parentNumber: "2500", reportSection: "Kortfristiga skulder", description: "Saldo hos Skatteverket" }),
  liability("2512", "Debiterad preliminärskatt", { parentNumber: "2500", reportSection: "Kortfristiga skulder", allowManualEntry: false }),

  // ── 2600–2699 Moms (utgående) ────────────────────────────────────────────
  group("2600", "Moms och särskilda punktskatter", "liability", "credit", "balance_sheet", "Kortfristiga skulder", 2600),
  liability("2610", "Utgående moms, 25 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP1", description: "Utgående moms 25% på försäljning" }),
  liability("2611", "Utgående moms, 12 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP2", description: "Utgående moms 12% (livsmedel, hotell)" }),
  liability("2612", "Utgående moms, 6 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP3", description: "Utgående moms 6% (böcker, kultur, persontransport)" }),
  liability("2614", "Utgående moms omvänd skattskyldighet, 25 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder", description: "Omvänd momsskyldighet" }),
  liability("2615", "Utgående moms omvänd skattskyldighet, 12 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder" }),
  liability("2616", "Utgående moms omvänd skattskyldighet, 6 %", { parentNumber: "2600", reportSection: "Kortfristiga skulder" }),
  asset("2640",     "Ingående moms", { type: "asset", normalSide: "debit", parentNumber: "2600", reportSection: "Omsättningstillgångar", description: "Avdragsgill ingående moms" }),
  liability("2650", "Momsredovisningskonto", { parentNumber: "2600", reportSection: "Kortfristiga skulder", allowManualEntry: false, description: "Netto moms att betala/få tillbaka" }),

  // ── 2700–2799 Personalskatter ────────────────────────────────────────────
  group("2700", "Personalskatter och sociala avgifter", "liability", "credit", "balance_sheet", "Kortfristiga skulder", 2700),
  liability("2710", "Personalskatt", { parentNumber: "2700", reportSection: "Kortfristiga skulder", description: "Innehållen preliminärskatt för personal" }),
  liability("2730", "Lagstadgade sociala avgifter", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2731", "Arbetsgivaravgifter", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),

  // ── 2800–2899 Upplupna kostnader ─────────────────────────────────────────
  group("2800", "Upplupna kostnader och förutbetalda intäkter", "liability", "credit", "balance_sheet", "Kortfristiga skulder", 2800),
  liability("2820", "Upplupna semesterlöner", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2830", "Upplupna löner och ersättningar", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2840", "Upplupna arbetsgivaravgifter", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2910", "Förutbetalda hyresintäkter", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2920", "Upplupna räntekostnader", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2990", "Övriga upplupna kostnader och förutbetalda intäkter", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),

  // ── Klass 2 — tillägg ────────────────────────────────────────────────────
  equity("2011", "Aktiekapital, AB", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2041", "Reservfond", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2045", "Fond för verkligt värde", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2051", "Balanserat resultat, aktiebolag", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2061", "Årets resultat", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2090", "Eget kapital, enskild firma", { parentNumber: "2000", reportSection: "Eget kapital" }),
  equity("2091", "Eget kapital, enskild firma", { parentNumber: "2000", reportSection: "Eget kapital" }),
  liability("2111", "Periodiseringsfond, äldst", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2112", "Periodiseringsfond, äldst-1", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2113", "Periodiseringsfond, äldst-2", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2114", "Periodiseringsfond, äldst-3", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2115", "Periodiseringsfond, äldst-4", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2120", "Ersättningsfonder", { parentNumber: "2100", reportSection: "Obeskattade reserver" }),
  liability("2211", "Avsättning för pensioner, direktpension", { parentNumber: "2200", reportSection: "Avsättningar" }),
  liability("2220", "Uppskjutna skatteskulder", { parentNumber: "2200", reportSection: "Avsättningar" }),
  liability("2230", "Övriga avsättningar", { parentNumber: "2200", reportSection: "Avsättningar" }),
  liability("2310", "Obligationslån", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2320", "Checkräkningskredit", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2321", "Utnyttjad checkräkningskredit", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2325", "Anslutna konton (pool)", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2341", "Långfristiga banklån", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2391", "Skulder till delägare eller närstående (långfristiga)", { parentNumber: "2350", reportSection: "Långfristiga skulder" }),
  liability("2410", "Kortfristig del av långfristiga skulder", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2420", "Förskott från kunder", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2430", "Pågående arbeten, fakturering", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2441", "Leverantörsskulder", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2442", "Leverantörsskulder till närstående", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2460", "Skulder till koncernföretag (kortfristiga)", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2480", "Skulder till delägare/närstående (kortfristiga)", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2490", "Övriga kortfristiga skulder", { parentNumber: "2400", reportSection: "Kortfristiga skulder" }),
  liability("2511", "Aktuell skatteskuld", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  liability("2513", "Skatteskuld, deklaration", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  liability("2514", "Skattekonto, obetald skatt", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  liability("2515", "Beräknad inkomstskatt", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  liability("2516", "Preliminär skatt", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  liability("2518", "Skattekontosaldo", { parentNumber: "2500", reportSection: "Kortfristiga skulder" }),
  // 2612 exists as "Utgående moms, 6 %" — standard BAS has 2612 for "Utgående moms 25%, varor"; TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  liability("2613", "Utgående moms 25%, tjänster", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP1" }),
  liability("2622", "Utgående moms 12%, varor", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP2" }),
  liability("2632", "Utgående moms 6%, varor", { parentNumber: "2600", reportSection: "Kortfristiga skulder", vatCode: "MP3" }),
  asset("2641", "Ingående moms", { parentNumber: "2600", reportSection: "Omsättningstillgångar" }),
  asset("2642", "Ingående moms omvänd skattskyldighet", { parentNumber: "2600", reportSection: "Omsättningstillgångar" }),
  asset("2645", "Beräknad ingående moms vid förvärv från utlandet", { parentNumber: "2600", reportSection: "Omsättningstillgångar" }),
  liability("2690", "Moms, blandad verksamhet", { parentNumber: "2600", reportSection: "Kortfristiga skulder" }),
  liability("2711", "Avdragen preliminärskatt", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2732", "Arbetsgivaravgifter, retroaktiva", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2750", "Personalförmåner, skattepliktig del", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2760", "Semesterlöneskuld", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2770", "Tjänstepensionsskuld", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2780", "Övriga skulder till anställda", { parentNumber: "2700", reportSection: "Kortfristiga skulder" }),
  liability("2810", "Checkräkningskredit, kortfristig", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  // 2820 exists as "Upplupna semesterlöner" — skip duplicate
  // 2840 exists as "Upplupna arbetsgivaravgifter" — skip duplicate
  // 2920 exists as "Upplupna räntekostnader" — skip duplicate
  liability("2930", "Upplupna sociala avgifter", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2940", "Upplupna räntekostnader, kortfristiga", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2960", "Förutbetalda intäkter", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),
  liability("2970", "Övriga upplupna kostnader", { parentNumber: "2800", reportSection: "Kortfristiga skulder" }),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 3 — RÖRELSENS INTÄKTER
  // ══════════════════════════════════════════════════════════════════════════

  cls("3000", "Rörelsens intäkter", "income", "credit", "income_statement", "Rörelsens intäkter", 3000),

  group("3000", "Försäljning och intäkter", "income", "credit", "income_statement", "Rörelsens intäkter", 3000),

  // 25 % moms — standardsats
  income("3001", "Försäljning av tjänster, 25 % moms", { parentNumber: "3000", vatCode: "MP1", description: "Intäkter från tjänsteförsäljning med 25% moms" }),
  income("3002", "Försäljning av varor, 25 % moms",   { parentNumber: "3000", vatCode: "MP1", description: "Intäkter från varuförsäljning med 25% moms" }),

  // EU och export
  income("3010", "Försäljning till kunder i EU (momsfri)", { parentNumber: "3000", vatCode: "MF", description: "EU-försäljning med VAT-nr — omvänd skattskyldighet" }),
  income("3040", "Försäljning utanför EU (export)",    { parentNumber: "3000", vatCode: "MF", description: "Export utanför EU — momsfri" }),

  // 12 % moms — livsmedel, hotell
  income("3051", "Försäljning av tjänster, 12 % moms", { parentNumber: "3000", vatCode: "MP2", description: "Tjänsteförsäljning med 12% moms (hotell, camping)" }),
  income("3052", "Försäljning av varor, 12 % moms",   { parentNumber: "3000", vatCode: "MP2", description: "Varuförsäljning med 12% moms (livsmedel)" }),

  // 6 % moms — kultur, transport, böcker
  income("3101", "Försäljning av tjänster, 6 % moms", { parentNumber: "3000", vatCode: "MP3", description: "Tjänsteförsäljning med 6% moms (böcker, kultur, transport)" }),
  income("3102", "Försäljning av varor, 6 % moms",   { parentNumber: "3000", vatCode: "MP3", description: "Varuförsäljning med 6% moms" }),

  // Momsfri
  income("3201", "Intäkter momsfri verksamhet",        { parentNumber: "3000", vatCode: "MF",  description: "Momsfri omsättning (t.ex. sjukvård, utbildning)" }),

  // Övrigt
  income("3520", "Fakturerade kostnader",               { parentNumber: "3000", description: "Vidarefakturerade utlägg" }),
  income("3521", "Kreditnota",                          { parentNumber: "3000", description: "Kreditering av tidigare försäljning" }),
  income("3590", "Övriga rörelseintäkter",              { parentNumber: "3000" }),
  income("3740", "Öresavrundning",                      { parentNumber: "3000", description: "Avrundningsdifferenser" }),
  income("3970", "Erhållna bidrag",                     { parentNumber: "3000", vatCode: "MF" }),
  income("3980", "Hyresintäkter",                       { parentNumber: "3000" }),

  // ── Klass 3 — tillägg ────────────────────────────────────────────────────
  income("3004", "Försäljning av varor, momsfri", { parentNumber: "3000", vatCode: "MF" }),
  income("3041", "Försäljning av tjänster, 25% moms", { parentNumber: "3000", vatCode: "MP1" }),
  income("3042", "Försäljning av tjänster, 12% moms", { parentNumber: "3000", vatCode: "MP2" }),
  income("3043", "Försäljning av tjänster, 6% moms", { parentNumber: "3000", vatCode: "MP3" }),
  income("3044", "Försäljning av tjänster, momsfri", { parentNumber: "3000", vatCode: "MF" }),
  income("3100", "Varuförsäljning EU", { parentNumber: "3000", vatCode: "MF" }),
  income("3105", "Varuförsäljning utanför EU, export", { parentNumber: "3000", vatCode: "MF" }),
  income("3106", "Varuförsäljning utanför EU", { parentNumber: "3000", vatCode: "MF" }),
  income("3108", "Tjänsteförsäljning inom EU", { parentNumber: "3000", vatCode: "MF" }),
  income("3110", "Tjänsteförsäljning utanför EU", { parentNumber: "3000", vatCode: "MF" }),
  income("3211", "Lagerökning egentillverkat varulager", { parentNumber: "3000" }),
  income("3230", "Aktiverat arbete", { parentNumber: "3000" }),
  income("3240", "Aktiverat arbete, anläggningstillgångar", { parentNumber: "3000" }),
  income("3401", "Lämnade rabatter", { parentNumber: "3000", normalSide: "debit" }),
  income("3402", "Kassarabatter, utgående", { parentNumber: "3000", normalSide: "debit" }),
  income("3403", "Snabbbetalningsrabatter", { parentNumber: "3000", normalSide: "debit" }),
  income("3540", "Fakturaavgifter", { parentNumber: "3000" }),
  income("3611", "Hyresintäkter, fastigheter", { parentNumber: "3000" }),
  income("3612", "Hyresintäkter, maskiner", { parentNumber: "3000" }),
  income("3620", "Intäkter från serviceverksamhet", { parentNumber: "3000" }),
  income("3630", "Royalty och licensintäkter", { parentNumber: "3000" }),
  income("3640", "Provisionsintäkter", { parentNumber: "3000" }),
  income("3710", "Vinst vid avyttring, immateriella", { parentNumber: "3000" }),
  income("3720", "Vinst vid avyttring, materiella", { parentNumber: "3000" }),
  income("3730", "Vinst vid avyttring, dotterbolag", { parentNumber: "3000" }),
  income("3750", "Lönesubventioner", { parentNumber: "3000" }),
  income("3760", "Erhållna bidrag", { parentNumber: "3000", vatCode: "MF" }),
  income("3790", "Övriga erhållna ersättningar", { parentNumber: "3000" }),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 4 — MATERIAL OCH VAROR
  // ══════════════════════════════════════════════════════════════════════════

  cls("4000", "Material och varor", "expense", "debit", "income_statement", "Rörelsens kostnader", 4000),

  group("4000", "Inköp av varor och material", "expense", "debit", "income_statement", "Rörelsens kostnader", 4000),
  expense("4010", "Inköp av råvaror och förnödenheter",   { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),
  expense("4400", "Inköp av handelsvaror",                 { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),
  expense("4600", "Legoarbeten och underentreprenörer",    { parentNumber: "4000", reportSection: "Rörelsens kostnader", description: "Inhyrd arbetskraft för produktion" }),
  expense("4900", "Förändring av lager av råvaror",        { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),

  // ── Klass 4 — tillägg ────────────────────────────────────────────────────
  expense("4011", "Inköp råvaror", { parentNumber: "4000" }),
  expense("4012", "Inköp tillsatsmaterial", { parentNumber: "4000" }),
  expense("4020", "Lagerförändring råvaror", { parentNumber: "4000" }),
  expense("4031", "Inköp handelsvaror, 25% moms", { parentNumber: "4000" }),
  expense("4032", "Inköp handelsvaror, 12% moms", { parentNumber: "4000" }),
  expense("4033", "Inköp handelsvaror, 6% moms", { parentNumber: "4000" }),
  expense("4034", "Inköp handelsvaror, momsfri", { parentNumber: "4000" }),
  expense("4040", "Lagerförändring, handelslager", { parentNumber: "4000" }),
  expense("4110", "Underentreprenörer", { parentNumber: "4000" }),
  expense("4310", "Förändring halfabrikatlager", { parentNumber: "4000" }),
  expense("4320", "Förändring färdigvarulager", { parentNumber: "4000" }),
  expense("4411", "Inköp varor från EU, 25% moms", { parentNumber: "4000" }),
  expense("4412", "Inköp varor från EU, 12% moms", { parentNumber: "4000" }),
  expense("4413", "Inköp varor från EU, 6% moms", { parentNumber: "4000" }),
  expense("4414", "Inköp varor från EU, momsfri", { parentNumber: "4000" }),
  expense("4420", "Inköp tjänster från EU (omvänd skattskyldighet)", { parentNumber: "4000" }),
  expense("4425", "Inköp tjänster utanför EU", { parentNumber: "4000" }),
  expense("4430", "Import av varor utanför EU", { parentNumber: "4000" }),
  expense("4431", "Import varor, 25% moms (tull)", { parentNumber: "4000" }),
  expense("4440", "Frakter och tullkostnader", { parentNumber: "4000" }),
  expense("4730", "Underentreprenörer, tjänster", { parentNumber: "4000" }),
  expense("4910", "Förändring PIA", { parentNumber: "4000" }),
  expense("4920", "Förändring PIA, tjänster", { parentNumber: "4000" }),
  expense("4930", "Förändring PIA, varor", { parentNumber: "4000" }),
  expense("4940", "Aktiverat arbete (kredit)", { parentNumber: "4000", normalSide: "credit" }),
  expense("4950", "Lagerförändring", { parentNumber: "4000" }),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 5 — ÖVRIGA EXTERNA KOSTNADER (del 1)
  // ══════════════════════════════════════════════════════════════════════════

  cls("5000", "Övriga externa rörelsekostnader", "expense", "debit", "income_statement", "Rörelsens kostnader", 5000),

  group("5000", "Lokalkostnader", "expense", "debit", "income_statement", "Rörelsens kostnader", 5000),
  expense("5010", "Lokalhyra",                             { parentNumber: "5000", reportSection: "Rörelsens kostnader" }),
  expense("5020", "El för lokaler",                        { parentNumber: "5000", reportSection: "Rörelsens kostnader" }),
  expense("5060", "Städning och renhållning",              { parentNumber: "5000", reportSection: "Rörelsens kostnader" }),
  expense("5090", "Övriga lokalkostnader",                 { parentNumber: "5000", reportSection: "Rörelsens kostnader" }),

  expense("5400", "Förbrukningsinventarier",               { reportSection: "Rörelsens kostnader", description: "Inventarier som kostnadsförs direkt (≤ halvt prisbasbelopp)" }),
  expense("5420", "Förbrukningsmaterial",                  { reportSection: "Rörelsens kostnader" }),
  expense("5500", "Reparation och underhåll av maskiner",  { reportSection: "Rörelsens kostnader" }),
  expense("5610", "Personbilar",                           { reportSection: "Rörelsens kostnader", description: "Kostnader för personbilar i rörelsen" }),
  expense("5620", "Lastbilar och skåpbilar",               { reportSection: "Rörelsens kostnader" }),
  expense("5800", "Resekostnader",                         { reportSection: "Rörelsens kostnader" }),
  expense("5810", "Biljetter och resetillägg",             { reportSection: "Rörelsens kostnader" }),
  expense("5830", "Kost och logi",                         { reportSection: "Rörelsens kostnader" }),
  expense("5900", "Reklam och PR",                         { reportSection: "Rörelsens kostnader" }),
  expense("5910", "Annonsering",                           { reportSection: "Rörelsens kostnader" }),
  expense("5930", "Reklamtrycksaker och kataloger",         { reportSection: "Rörelsens kostnader" }),
  expense("5960", "PR och informationskostnader",          { reportSection: "Rörelsens kostnader" }),
  expense("5970", "Representation",                        { reportSection: "Rörelsens kostnader", description: "Avdrag max 90 kr/person ex. moms" }),

  // ── Klass 5 — tillägg ────────────────────────────────────────────────────
  expense("5011", "Hyra av lokaler", { parentNumber: "5000" }),
  expense("5012", "El och vatten för lokaler", { parentNumber: "5000" }),
  expense("5013", "Uppvärmning", { parentNumber: "5000" }),
  expense("5030", "Städning och renhållning", { parentNumber: "5000" }),
  expense("5040", "Reparation och underhåll av lokaler", { parentNumber: "5000" }),
  expense("5110", "Fastighetsskatt och avgifter"),
  expense("5120", "Fastighetsskötsel"),
  expense("5130", "Reparation och underhåll, egna fastigheter"),
  expense("5150", "Vattenavgifter"),
  expense("5160", "El"),
  expense("5190", "Övriga fastighetskostnader"),
  expense("5211", "Leasing av maskiner"),
  expense("5212", "Hyra av inventarier"),
  expense("5220", "Hyra av datorer"),
  expense("5250", "Hyra av bilar"),
  expense("5260", "Leasing av transportmedel"),
  expense("5290", "Övriga hyreskostnader"),
  expense("5411", "Inventarier under halvt prisbasbelopp"),
  expense("5412", "Datorer och kringutrustning under halvt prisbasbelopp"),
  expense("5460", "Förpackningsmaterial"),
  expense("5490", "Övriga förbrukningsinventarier"),
  expense("5511", "Reparation och underhåll, maskiner"),
  expense("5512", "Reparation och underhåll, inventarier"),
  expense("5520", "Reparation och underhåll, fordon"),
  expense("5530", "Reparation och underhåll, datorer"),
  expense("5590", "Övriga reparationskostnader"),
  expense("5611", "Drivmedel, bensin/diesel"),
  expense("5613", "Bränsle"),
  expense("5615", "Bilförsäkring och skatt"),
  expense("5630", "Drivmedelskostnader"),
  expense("5640", "Parkering och biltullar"),
  expense("5690", "Övriga transportkostnader"),
  expense("5710", "Frakter och transporter"),
  expense("5720", "Speditörer"),
  expense("5730", "Tull- och importavgifter"),
  expense("5740", "Frakter vid försäljning"),
  expense("5790", "Övriga fraktkostnader"),
  expense("5820", "Hotellkostnader"),
  expense("5840", "Rese- och hotellkostnader, utland"),
  expense("5890", "Övriga resekostnader"),
  expense("5920", "Revisionsarvode"),
  // 5930 exists as "Reklamtrycksaker och kataloger"; standard BAS 5930 = "Juridiska tjänster" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("5931", "Juridiska tjänster"),
  expense("5940", "IT-konsulter"),
  // 5960 exists as "PR och informationskostnader"; standard BAS 5960 = "Myndighetskostnader" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("5961", "Myndighetskostnader"),
  // 5970 exists as "Representation" — skip duplicate
  expense("5990", "Övriga externa tjänster"),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 6 — ÖVRIGA EXTERNA KOSTNADER (del 2)
  // ══════════════════════════════════════════════════════════════════════════

  cls("6000", "Övriga externa kostnader", "expense", "debit", "income_statement", "Rörelsens kostnader", 6000),

  expense("6010", "Administrativa kostnader",              { reportSection: "Rörelsens kostnader" }),
  expense("6020", "Kontorsmaterial",                       { reportSection: "Rörelsens kostnader" }),
  expense("6030", "Datakostnader",                         { reportSection: "Rörelsens kostnader" }),
  expense("6040", "Tidningar, böcker och facklitteratur",  { reportSection: "Rörelsens kostnader" }),
  expense("6050", "Trycksaker",                            { reportSection: "Rörelsens kostnader" }),
  expense("6070", "Utbildningskostnader",                  { reportSection: "Rörelsens kostnader" }),
  expense("6150", "Telefon och porto",                     { reportSection: "Rörelsens kostnader" }),
  expense("6200", "Försäkringspremier",                    { reportSection: "Rörelsens kostnader" }),
  expense("6310", "Redovisningskonsulter",                 { reportSection: "Rörelsens kostnader", description: "Bokförings- och redovisningstjänster" }),
  expense("6320", "Revisionsarvode",                       { reportSection: "Rörelsens kostnader" }),
  expense("6330", "Juridiska kostnader",                   { reportSection: "Rörelsens kostnader" }),
  expense("6400", "Styrelsearvoden och liknande",          { reportSection: "Rörelsens kostnader" }),
  expense("6530", "Licensavgifter och royalties",          { reportSection: "Rörelsens kostnader" }),
  expense("6550", "IT-tjänster och licenser",              { reportSection: "Rörelsens kostnader", description: "Molntjänster, SaaS, systemförvaltning" }),
  expense("6560", "Programvaror",                          { reportSection: "Rörelsens kostnader" }),
  expense("6570", "Kostnader för hemsida",                 { reportSection: "Rörelsens kostnader" }),
  expense("6710", "Förlust kundfordringar",                { reportSection: "Rörelsens kostnader", description: "Konstaterade kundförluster" }),
  expense("6720", "Lämnade bidrag",                        { reportSection: "Rörelsens kostnader" }),
  expense("6900", "Övriga externa kostnader",              { reportSection: "Rörelsens kostnader" }),
  expense("6970", "Öresavrundning",                        { reportSection: "Rörelsens kostnader" }),
  expense("6980", "Valutakursförluster",                   { reportSection: "Rörelsens kostnader" }),
  expense("6990", "Övriga rörelsekostnader",               { reportSection: "Rörelsens kostnader" }),

  // ── Klass 6 — tillägg ────────────────────────────────────────────────────
  expense("6211", "Telefon"),
  expense("6212", "Mobiltelefon"),
  expense("6213", "Internetabonnemang"),
  expense("6214", "Fax"),
  expense("6215", "Porto"),
  expense("6220", "Datakommunikation"),
  expense("6230", "Driftkostnader datorer"),
  expense("6260", "Trycksaker"),
  expense("6270", "Böcker och tidskrifter"),
  expense("6280", "Prenumerationer"),
  // 6310 exists as "Redovisningskonsulter"; standard BAS 6310 = "Annonsering" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("6311", "Annonsering"),
  // 6330 exists as "Juridiska kostnader"; standard BAS 6330 = "Mässor och utställningar" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("6331", "Mässor och utställningar"),
  expense("6340", "Marknadsanalyser"),
  expense("6350", "Reklamtrycksaker"),
  expense("6360", "Webbplatskostnader"),
  expense("6370", "Sponsring"),
  expense("6380", "PR och informationskostnader"),
  expense("6410", "Försäkringspremier"),
  expense("6420", "Försäkringar, egendom"),
  expense("6430", "Transportförsäkringar"),
  expense("6440", "Säkerhetstjänster"),
  expense("6450", "Förluster på kundfordringar"),
  expense("6460", "Kassadifferenser"),
  expense("6470", "Inkasso"),
  expense("6540", "Datormaterial"),
  expense("6610", "Personalfester"),
  expense("6620", "Intern representation"),
  expense("6630", "Extern representation"),
  expense("6640", "Konferenser och kurser"),
  expense("6650", "Gåvor och PR-artiklar"),
  expense("6660", "Gåvor till kunder"),
  expense("6670", "Personalvård och friskvård"),
  // 6710 exists as "Förlust kundfordringar"; standard BAS 6710 = "Licenser och royalties" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("6711", "Licenser och royalties"),
  // 6720 exists as "Lämnade bidrag"; standard BAS 6720 = "Programvaror" — TODO: verifiera mot officiell BAS 2026 PDF — nummer kan skilja
  expense("6721", "Programvaror"),
  expense("6730", "Plattformsavgifter"),
  expense("6740", "Royalty"),
  expense("6750", "Franchisekostnader"),
  expense("6810", "Bankavgifter"),
  expense("6820", "Kortavgifter"),
  expense("6830", "Factoring kostnader"),
  expense("6840", "Bankgarantier"),
  expense("6870", "Courtagekostnader"),
  expense("6920", "Lämnade bidrag"),
  expense("6930", "Skadestånd"),
  expense("6940", "Förseningsavgifter och skattetillägg"),
  expense("6950", "Böter och sanktionsavgifter"),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 7 — PERSONALKOSTNADER
  // ══════════════════════════════════════════════════════════════════════════

  cls("7000", "Personalkostnader", "expense", "debit", "income_statement", "Rörelsens kostnader", 7000),

  group("7000", "Löner och arvoden", "expense", "debit", "income_statement", "Rörelsens kostnader", 7000),
  expense("7010", "Löner till kollektivanställda",          { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),
  expense("7210", "Löner till tjänstemän",                  { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),
  expense("7220", "Löner till företagsledare",              { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),
  expense("7281", "Tantiem och gratifikationer",            { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),
  expense("7282", "Semesterlöner",                          { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),
  expense("7290", "Övriga löner och ersättningar",          { parentNumber: "7000", reportSection: "Rörelsens kostnader" }),

  group("7300", "Sociala kostnader och pensionskostnader", "expense", "debit", "income_statement", "Rörelsens kostnader", 7300),
  expense("7310", "Lagstadgade arbetsgivaravgifter",        { parentNumber: "7300", reportSection: "Rörelsens kostnader", description: "Sociala avgifter på löner" }),
  expense("7320", "Arbetsgivaravgifter på naturaförmåner",  { parentNumber: "7300", reportSection: "Rörelsens kostnader" }),
  expense("7370", "Pensionskostnader",                      { parentNumber: "7300", reportSection: "Rörelsens kostnader" }),
  expense("7380", "Kostnader för sjuk- och hälsovård",      { parentNumber: "7300", reportSection: "Rörelsens kostnader" }),
  expense("7390", "Övriga sociala och andra personalkostnader", { parentNumber: "7300", reportSection: "Rörelsens kostnader" }),

  group("7800", "Avskrivningar och nedskrivningar", "expense", "debit", "income_statement", "Rörelsens kostnader", 7800),
  expense("7810", "Avskrivningar på immateriella tillgångar", { parentNumber: "7800", reportSection: "Rörelsens kostnader" }),
  expense("7820", "Avskrivningar på byggnader och markanläggningar", { parentNumber: "7800", reportSection: "Rörelsens kostnader" }),
  expense("7830", "Avskrivningar på maskiner och inventarier",  { parentNumber: "7800", reportSection: "Rörelsens kostnader" }),
  expense("7832", "Avskrivningar på datorer",               { parentNumber: "7800", reportSection: "Rörelsens kostnader" }),

  // ── Klass 7 — tillägg ────────────────────────────────────────────────────
  expense("7011", "Löner, kollektivanställda", { parentNumber: "7000" }),
  expense("7012", "Övertidstillägg", { parentNumber: "7000" }),
  expense("7013", "Skift- och OB-tillägg", { parentNumber: "7000" }),
  expense("7021", "Löner, tjänstemän", { parentNumber: "7000" }),
  expense("7022", "Löner, företagsledning", { parentNumber: "7000" }),
  expense("7030", "Löner, deltidsanställda", { parentNumber: "7000" }),
  expense("7040", "Provision och tantiem", { parentNumber: "7000" }),
  expense("7050", "Semesterlöner", { parentNumber: "7000" }),
  expense("7060", "Sjuklöner", { parentNumber: "7000" }),
  expense("7070", "Avgångsvederlag", { parentNumber: "7000" }),
  expense("7090", "Övriga löner och ersättningar", { parentNumber: "7000" }),
  expense("7111", "Sociala avgifter, egenanställning", { parentNumber: "7300" }),
  expense("7120", "Avtalade arbetsgivarförsäkringar", { parentNumber: "7300" }),
  expense("7130", "Avtalade pensioner", { parentNumber: "7300" }),
  expense("7140", "Övriga tjänstepensionskostnader", { parentNumber: "7300" }),
  expense("7150", "Övriga personalkostnader", { parentNumber: "7300" }),
  expense("7160", "Arbetsgivaravgifter på styrelsearvoden", { parentNumber: "7300" }),
  // 7210, 7220, 7290 exist as löner; standard BAS pension accounts in same range — skip duplicates
  expense("7230", "Pensionskostnader, direktpensioner", { parentNumber: "7300" }),
  expense("7240", "Kollektiv pensionsförsäkring", { parentNumber: "7300" }),
  // 7310 exists as "Lagstadgade arbetsgivaravgifter"; 7320 exists as "Arbetsgivaravgifter på naturaförmåner" — skip
  expense("7330", "Personalfester", { parentNumber: "7300" }),
  expense("7340", "Personalvård", { parentNumber: "7300" }),
  expense("7350", "Friskvård", { parentNumber: "7300" }),
  expense("7510", "Bilförmån", { parentNumber: "7000" }),
  expense("7520", "Kostförmån", { parentNumber: "7000" }),
  expense("7530", "Bostadsförmån", { parentNumber: "7000" }),
  expense("7541", "Traktamenten inom Sverige", { parentNumber: "7000" }),
  expense("7542", "Traktamenten utom Sverige", { parentNumber: "7000" }),
  expense("7570", "Milersättning", { parentNumber: "7000" }),
  expense("7610", "Utbildningskostnader", { parentNumber: "7300" }),
  expense("7620", "Rekryteringskostnader", { parentNumber: "7300" }),
  expense("7630", "Personalvård", { parentNumber: "7300" }),
  expense("7690", "Friskvård", { parentNumber: "7300" }),
  expense("7821", "Avskrivning, byggnader", { parentNumber: "7800" }),
  expense("7823", "Avskrivning, markanläggningar", { parentNumber: "7800" }),
  expense("7824", "Avskrivning, fastighetsförbättringar", { parentNumber: "7800" }),
  expense("7825", "Avskrivning, förbättringsutgifter på annans fastighet", { parentNumber: "7800" }),
  expense("7831", "Avskrivning, maskiner", { parentNumber: "7800" }),
  expense("7834", "Avskrivning, bilar", { parentNumber: "7800" }),
  expense("7836", "Avskrivning, datorer", { parentNumber: "7800" }),
  expense("7838", "Avskrivning, leasingobjekt", { parentNumber: "7800" }),
  expense("7850", "Nedskrivning, anläggningstillgångar", { parentNumber: "7800" }),
  expense("7960", "Förlust vid avyttring, materiella tillgångar"),
  expense("7971", "Förlust vid avyttring, immateriella tillgångar"),
  expense("7980", "Nedskrivning, anläggningstillgångar"),
  expense("7990", "Övriga rörelsekostnader"),

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 8 — FINANSIELLA OCH EXTRAORDINÄRA POSTER, BOKSLUTSDISPOSITIONER
  // ══════════════════════════════════════════════════════════════════════════

  cls("8000", "Finansiella och extraordinära poster", "expense", "debit", "income_statement", "Finansiella poster", 8000),

  income("8300",  "Ränteintäkter och liknande intäkter",   { reportSection: "Finansiella poster", description: "Räntor på bankkonton och placeringar" }),
  income("8310",  "Ränteintäkter från bankkonton",          { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8330",  "Valutakursvinster",                      { parentNumber: "8300", reportSection: "Finansiella poster" }),
  expense("8400", "Räntekostnader och liknande kostnader",  { reportSection: "Finansiella poster" }),
  expense("8410", "Räntekostnader för kortfristiga skulder", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8420", "Räntekostnader för långfristiga skulder", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8430", "Dröjsmålsräntor för leverantörsskulder",  { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8440", "Valutakursförluster",                    { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8500", "Skatter och årsavgifter",                { reportSection: "Finansiella poster" }),
  expense("8510", "Inkomstskatter — kvartalsskatt",         { parentNumber: "8500", reportSection: "Finansiella poster" }),
  expense("8990", "Årets skattepliktiga inkomst",           { reportSection: "Finansiella poster", allowManualEntry: false, description: "Bokslutsdisposition — årets resultat före skatt" }),

  // ── Klass 8 — tillägg ────────────────────────────────────────────────────
  income("8011", "Ränteintäkter, banktillgodohavanden", { reportSection: "Finansiella poster" }),
  income("8012", "Ränteintäkter, obligationer", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8013", "Ränteintäkter, koncernfordringar", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8020", "Utdelningsintäkter", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8021", "Utdelning på aktier", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8031", "Valutakursvinster, realiserade", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8032", "Valutakursvinster, orealiserade", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  expense("8033", "Valutakursförluster", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8034", "Valutakursförluster, realiserade", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  income("8040", "Resultat från värdepappershandel", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8050", "Resultat, avyttring kortfristiga placeringar", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8060", "Övriga finansiella intäkter", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  income("8110", "Utdelning, dotterbolag", { reportSection: "Finansiella poster" }),
  expense("8120", "Nedskrivning, andelar dotterbolag", { reportSection: "Finansiella poster" }),
  income("8130", "Resultat, avyttring dotterbolagsandelar", { reportSection: "Finansiella poster" }),
  income("8150", "Ränteintäkter från koncernföretag", { reportSection: "Finansiella poster" }),
  expense("8160", "Räntekostnader till koncernföretag", { reportSection: "Finansiella poster" }),
  income("8210", "Utdelning, intresseföretag", { reportSection: "Finansiella poster" }),
  income("8220", "Resultat, avyttring intresseföretag", { reportSection: "Finansiella poster" }),
  // 8310 exists as "Ränteintäkter från bankkonton" — skip duplicate
  income("8320", "Ränteintäkter, finansiella anläggningstillgångar", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  expense("8350", "Nedskrivning, anläggningstillgångar", { reportSection: "Finansiella poster" }),
  income("8360", "Återföring, nedskrivning anläggningstillgångar", { reportSection: "Finansiella poster" }),
  income("8411", "Ränteintäkter, bank", { parentNumber: "8300", reportSection: "Finansiella poster" }),
  // 8420, 8430, 8440 exist as räntekostnader — skip duplicates
  income("8460", "Värdeförändring, kortfristiga placeringar", { reportSection: "Finansiella poster" }),
  expense("8511", "Räntekostnader, bank", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8512", "Räntor på skattekontot", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8520", "Räntekostnader till koncernföretag", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8530", "Räntekostnader till intresseföretag", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8540", "Valutakursförluster på skulder", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8560", "Räntekostnader, leasing", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8570", "Övriga räntekostnader", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8580", "Kapitalförlust, kortfristiga placeringar", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8590", "Övriga finansiella kostnader", { parentNumber: "8400", reportSection: "Finansiella poster" }),
  expense("8610", "Avsättning till periodiseringsfond", { reportSection: "Bokslutsdispositioner" }),
  income("8620", "Återföring av periodiseringsfond", { reportSection: "Bokslutsdispositioner" }),
  expense("8630", "Avsättning till ersättningsfond", { reportSection: "Bokslutsdispositioner" }),
  income("8640", "Återföring av ersättningsfond", { reportSection: "Bokslutsdispositioner" }),
  expense("8710", "Inkomstskatt", { reportSection: "Skatter" }),
  expense("8711", "Aktuell skatt, perioden", { reportSection: "Skatter" }),
  expense("8712", "Korrigering, tidigare års skatter", { reportSection: "Skatter" }),
  expense("8720", "Uppskjuten skatt", { reportSection: "Skatter" }),
  expense("8721", "Förändring, uppskjutna skattefordringar", { reportSection: "Skatter" }),
  expense("8722", "Förändring, uppskjutna skatteskulder", { reportSection: "Skatter" }),
  expense("8730", "Fastighetsskatt", { reportSection: "Skatter" }),
  expense("8740", "Övriga skatter", { reportSection: "Skatter" }),
  income("8750", "Schablonintäkt, periodiseringsfond", { reportSection: "Skatter" }),
  equity("8910", "Periodens resultat", { reportSection: "Årets resultat" }),
  equity("8920", "Minskning av eget kapital", { reportSection: "Årets resultat" }),
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getBasAccountByNumber(number: string): BasAccountTemplate | undefined {
  return BAS_ACCOUNTS.find(a => a.number === number)
}

export function getBasAccountsByType(type: AccountType): BasAccountTemplate[] {
  return BAS_ACCOUNTS.filter(a => a.type === type)
}

export function getBasIncomeAccounts(): BasAccountTemplate[] {
  return BAS_ACCOUNTS.filter(a => a.type === "income" && a.level === 3)
}

export function getVatAccounts(): BasAccountTemplate[] {
  return BAS_ACCOUNTS.filter(a => a.vatCode != null)
}
