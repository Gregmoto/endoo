// Swedish VAT type definitions — Single source of truth for all momstyper
// Verified against Skatteverket's rules for 2026.
// Reference: https://www.skatteverket.se/foretag/moms/redovisaintemoms/momsfria-transaktioner.html
// TODO: verifiera exakta momskoder och momsrader mot Skatteverkets blankett SKV 2113

export type VatTypeCode =
  | "SE25"           // Sverige 25% standardmoms
  | "SE12"           // Sverige 12% (livsmedel, hotell, restaurang)
  | "SE06"           // Sverige 6% (kultur, böcker, persontransport)
  | "SE00"           // Sverige 0% (sjukvård, försäkring, utbildning)
  | "EU_VARU"        // EU varuförsäljning, omvänd skattskyldighet
  | "EU_TJANST"      // EU tjänsteförsäljning (B2B)
  | "EU_VARU_INKOP"  // EU varuinköp (ingående moms)
  | "EU_TJANST_INKOP" // EU tjänsteinköp (ingående moms, omvänd)
  | "EXPORT"         // Export utanför EU (0%)
  | "OMVMOMS_BYGG"   // Omvänd skattskyldighet bygg och anläggningstjänster
  | "OMVMOMS_GULD"   // Omvänd skattskyldighet guld
  | "MFRI"           // Momsfri (ej omsatt i Sverige)
  | "VMB25"          // Vinstmarginalbeskattning 25%

export interface VatTypeDefinition {
  code: VatTypeCode
  label: string
  rate: number            // 0.25, 0.12, 0.06, 0 — momsandel av nettopris
  reverseCharge: boolean  // Omvänd skattskyldighet — köparen redovisar moms
  description: string
  /** Momsruta (ruta) på SKV2113 för utgående moms */
  vatBoxOut?: string
  /** Momsruta på SKV2113 för ingående moms / underlag */
  vatBoxIn?: string
  /** Standardkonto för försäljning i BAS-kontoplanen */
  defaultSalesAccount?: string
  /** Standardkonto för utgående moms i BAS */
  defaultVatAccount?: string
  /** Standardkonto för köp/kostnad */
  defaultPurchaseAccount?: string
  /** Kräver kundens VAT-nummer för att vara giltig */
  requiresCustomerVatNo?: boolean
  /** Visa tilläggsinformation på fakturan */
  invoiceNote?: string
}

// TODO: verifiera mot Skatteverket-PDF "Momsdeklaration 2026" (SKV 2113)
// för korrekta rutnummer. Nedan baserat på 2025 regelverk.
export const VAT_TYPES: Record<VatTypeCode, VatTypeDefinition> = {
  SE25: {
    code: "SE25",
    label: "Moms 25%",
    rate: 0.25,
    reverseCharge: false,
    description: "Standardmoms — gäller de flesta varor och tjänster",
    vatBoxOut: "10",
    defaultSalesAccount: "3001",
    defaultVatAccount: "2611",
  },
  SE12: {
    code: "SE12",
    label: "Moms 12%",
    rate: 0.12,
    reverseCharge: false,
    // TODO: verifiera BAS-konton för 12% moms
    description: "Reducerad moms — livsmedel, hotell, restaurang, konstnärlig verksamhet",
    vatBoxOut: "11",
    defaultSalesAccount: "3002",
    defaultVatAccount: "2621",
  },
  SE06: {
    code: "SE06",
    label: "Moms 6%",
    rate: 0.06,
    reverseCharge: false,
    // TODO: verifiera BAS-konton för 6% moms
    description: "Reducerad moms — böcker, tidningar, persontransport, kulturarrangemang",
    vatBoxOut: "12",
    defaultSalesAccount: "3003",
    defaultVatAccount: "2631",
  },
  SE00: {
    code: "SE00",
    label: "Momsfri (0%)",
    rate: 0,
    reverseCharge: false,
    description: "Momsfri omsättning i Sverige — sjukvård, tandvård, social omsorg, försäkring, utbildning",
    vatBoxOut: "42",
    defaultSalesAccount: "3041",
    defaultVatAccount: undefined,
  },
  EU_VARU: {
    code: "EU_VARU",
    label: "EU varuförsäljning (0% omvänd skattskyldighet)",
    rate: 0,
    reverseCharge: true,
    description: "Varuförsäljning till momsregistrerat företag inom EU. Kundens VAT-nummer krävs.",
    vatBoxOut: "35",
    // TODO: verifiera ruta 35 mot SKV-blankett för gemenskapsinternt förvärv
    defaultSalesAccount: "3105",
    defaultVatAccount: undefined,
    requiresCustomerVatNo: true,
    invoiceNote: "Reverse charge — VAT to be accounted by the recipient of the supply",
  },
  EU_TJANST: {
    code: "EU_TJANST",
    label: "EU tjänsteförsäljning (0% omvänd skattskyldighet)",
    rate: 0,
    reverseCharge: true,
    description: "Tjänsteförsäljning till momsregistrerat företag inom EU (B2B). Köparen redovisar moms i sitt land.",
    vatBoxOut: "39",
    // TODO: verifiera ruta 39 mot SKV-blankett
    defaultSalesAccount: "3108",
    requiresCustomerVatNo: true,
    invoiceNote: "Reverse charge — VAT to be accounted by the recipient of the supply",
  },
  EU_VARU_INKOP: {
    code: "EU_VARU_INKOP",
    label: "EU varuinköp (omvänd skattskyldighet)",
    rate: 0.25,
    reverseCharge: true,
    description: "Inköp av varor från momsregistrerat företag inom EU. Redovisa som utgående och ingående moms.",
    vatBoxOut: "20",
    vatBoxIn: "48",
    // TODO: verifiera rutor 20/48 mot SKV-blankett
    defaultPurchaseAccount: "4531",
    defaultVatAccount: "2614",
  },
  EU_TJANST_INKOP: {
    code: "EU_TJANST_INKOP",
    label: "EU tjänsteinköp (omvänd skattskyldighet)",
    rate: 0.25,
    reverseCharge: true,
    description: "Inköp av tjänster från momsregistrerat företag utomlands. Redovisa som utgående och ingående moms.",
    vatBoxOut: "24",
    vatBoxIn: "48",
    // TODO: verifiera rutor 24/48 mot SKV-blankett
    defaultPurchaseAccount: "4535",
    defaultVatAccount: "2614",
  },
  EXPORT: {
    code: "EXPORT",
    label: "Export (0%) utanför EU",
    rate: 0,
    reverseCharge: false,
    description: "Försäljning av varor till köpare utanför EU. Exporthandlingar krävs.",
    vatBoxOut: "36",
    defaultSalesAccount: "3106",
    invoiceNote: "VAT 0% — Export sale outside the EU",
  },
  OMVMOMS_BYGG: {
    code: "OMVMOMS_BYGG",
    label: "Omvänd skattskyldighet bygg (0%)",
    rate: 0,
    reverseCharge: true,
    description: "Omvänd skattskyldighet för byggtjänster och anläggningstjänster i Sverige.",
    vatBoxOut: "41",
    // TODO: verifiera ruta 41 mot SKV-blankett
    defaultSalesAccount: "3231",
    invoiceNote: "Omvänd skattskyldighet — köparen redovisar moms (6 kap. 7 § ML)",
  },
  OMVMOMS_GULD: {
    code: "OMVMOMS_GULD",
    label: "Omvänd skattskyldighet guld (0%)",
    rate: 0,
    reverseCharge: true,
    description: "Omvänd skattskyldighet för handel med investeringsguld.",
    vatBoxOut: "41",
    defaultSalesAccount: "3261",
    invoiceNote: "Omvänd skattskyldighet — investeringsguld",
  },
  MFRI: {
    code: "MFRI",
    label: "Ej momspliktig",
    rate: 0,
    reverseCharge: false,
    description: "Transaktion som inte är omsättning i momslagens mening. Ingen momsredovisning.",
    vatBoxOut: undefined,
    defaultSalesAccount: "3041",
  },
  VMB25: {
    code: "VMB25",
    label: "Vinstmarginalbeskattning 25%",
    rate: 0.25,
    reverseCharge: false,
    description: "Vinstmarginalbeskattning för begagnade varor, konst, samlarföremål och antikviteter.",
    vatBoxOut: "06",
    // TODO: verifiera ruta 06 och korrekt BAS-konton för VMB
    defaultSalesAccount: "3001",
    defaultVatAccount: "2611",
    invoiceNote: "Vinstmarginalbeskattning — moms ingår i priset",
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getVatType(code: string): VatTypeDefinition | undefined {
  return VAT_TYPES[code as VatTypeCode]
}

export function getVatRate(code: string): number {
  return getVatType(code)?.rate ?? 0.25
}

export function isReverseCharge(code: string): boolean {
  return getVatType(code)?.reverseCharge ?? false
}

/** All VAT codes that result in zero VAT on the output */
export function isZeroRated(code: string): boolean {
  const def = getVatType(code)
  return !def || def.rate === 0
}

export const VAT_TYPE_OPTIONS = Object.values(VAT_TYPES).map(v => ({
  value: v.code,
  label: v.label,
  rate: v.rate,
  reverseCharge: v.reverseCharge,
}))
