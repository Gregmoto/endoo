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

  // ══════════════════════════════════════════════════════════════════════════
  // KLASS 4 — MATERIAL OCH VAROR
  // ══════════════════════════════════════════════════════════════════════════

  cls("4000", "Material och varor", "expense", "debit", "income_statement", "Rörelsens kostnader", 4000),

  group("4000", "Inköp av varor och material", "expense", "debit", "income_statement", "Rörelsens kostnader", 4000),
  expense("4010", "Inköp av råvaror och förnödenheter",   { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),
  expense("4400", "Inköp av handelsvaror",                 { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),
  expense("4600", "Legoarbeten och underentreprenörer",    { parentNumber: "4000", reportSection: "Rörelsens kostnader", description: "Inhyrd arbetskraft för produktion" }),
  expense("4900", "Förändring av lager av råvaror",        { parentNumber: "4000", reportSection: "Rörelsens kostnader" }),

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
