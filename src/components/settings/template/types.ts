export type TemplateFormValues = {
  // Mall-inställningar
  name:            string
  language:        "sv" | "en"
  showLogo:        boolean
  isDefault:       boolean
  isActive:        boolean
  // Logotyp
  logoUrl:         string
  // Adress & Kontakt
  postalAddress:   string
  streetAddress:   string
  phone:           string
  fax:             string
  email:           string
  website:         string
  // Bankuppgifter
  bankgiro:        string
  plusgiro:        string
  iban:            string
  bic:             string
  vatNumber:       string
  fScattCertified: boolean
  // Swish
  showSwishQr:     boolean
  swishNumber:     string
  // Företag
  boardSeat:       string
  // Text
  footerText:      string
}

export const EMPTY_FORM: TemplateFormValues = {
  name: "Standard", language: "sv", showLogo: true, isDefault: true, isActive: true,
  logoUrl: "", postalAddress: "", streetAddress: "", phone: "", fax: "",
  email: "", website: "", bankgiro: "", plusgiro: "", iban: "", bic: "",
  vatNumber: "", fScattCertified: true, showSwishQr: false, swishNumber: "",
  boardSeat: "", footerText: "",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formFromTemplate(t: any): TemplateFormValues {
  return {
    name:            t.name            ?? "Standard",
    language:        t.language        ?? "sv",
    showLogo:        t.showLogo        ?? true,
    isDefault:       t.isDefault       ?? false,
    isActive:        t.isActive        ?? true,
    logoUrl:         t.logoUrl         ?? "",
    postalAddress:   t.postalAddress   ?? "",
    streetAddress:   t.streetAddress   ?? "",
    phone:           t.phone           ?? "",
    fax:             t.fax             ?? "",
    email:           t.email           ?? "",
    website:         t.website         ?? "",
    bankgiro:        t.bankgiro        ?? "",
    plusgiro:        t.plusgiro        ?? "",
    iban:            t.iban            ?? "",
    bic:             t.bic             ?? "",
    vatNumber:       t.vatNumber       ?? "",
    fScattCertified: t.fScattCertified ?? true,
    showSwishQr:     t.showSwishQr     ?? false,
    swishNumber:     t.swishNumber     ?? "",
    boardSeat:       t.boardSeat       ?? "",
    footerText:      t.footerText      ?? "",
  }
}
