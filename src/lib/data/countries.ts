export interface Country {
  code:        string   // ISO 3166-1 alpha-2
  name:        string   // Swedish name
  dialCode:    string   // e.g. "+46"
  vatPrefix?:  string   // EU VAT prefix
  eu:          boolean
}

export const COUNTRIES: Country[] = [
  // Nordic
  { code: "SE", name: "Sverige",          dialCode: "+46",  vatPrefix: "SE",  eu: true  },
  { code: "NO", name: "Norge",             dialCode: "+47",  vatPrefix: undefined, eu: false },
  { code: "DK", name: "Danmark",           dialCode: "+45",  vatPrefix: "DK",  eu: true  },
  { code: "FI", name: "Finland",           dialCode: "+358", vatPrefix: "FI",  eu: true  },
  { code: "IS", name: "Island",            dialCode: "+354", vatPrefix: undefined, eu: false },
  // EU (sorted Swedish name)
  { code: "BE", name: "Belgien",           dialCode: "+32",  vatPrefix: "BE",  eu: true  },
  { code: "BG", name: "Bulgarien",         dialCode: "+359", vatPrefix: "BG",  eu: true  },
  { code: "CY", name: "Cypern",            dialCode: "+357", vatPrefix: "CY",  eu: true  },
  { code: "EE", name: "Estland",           dialCode: "+372", vatPrefix: "EE",  eu: true  },
  { code: "FR", name: "Frankrike",         dialCode: "+33",  vatPrefix: "FR",  eu: true  },
  { code: "GR", name: "Grekland",          dialCode: "+30",  vatPrefix: "EL",  eu: true  },
  { code: "IE", name: "Irland",            dialCode: "+353", vatPrefix: "IE",  eu: true  },
  { code: "IT", name: "Italien",           dialCode: "+39",  vatPrefix: "IT",  eu: true  },
  { code: "HR", name: "Kroatien",          dialCode: "+385", vatPrefix: "HR",  eu: true  },
  { code: "LV", name: "Lettland",          dialCode: "+371", vatPrefix: "LV",  eu: true  },
  { code: "LI", name: "Liechtenstein",     dialCode: "+423", vatPrefix: undefined, eu: false },
  { code: "LT", name: "Litauen",           dialCode: "+370", vatPrefix: "LT",  eu: true  },
  { code: "LU", name: "Luxemburg",         dialCode: "+352", vatPrefix: "LU",  eu: true  },
  { code: "MT", name: "Malta",             dialCode: "+356", vatPrefix: "MT",  eu: true  },
  { code: "NL", name: "Nederländerna",     dialCode: "+31",  vatPrefix: "NL",  eu: true  },
  { code: "PL", name: "Polen",             dialCode: "+48",  vatPrefix: "PL",  eu: true  },
  { code: "PT", name: "Portugal",          dialCode: "+351", vatPrefix: "PT",  eu: true  },
  { code: "RO", name: "Rumänien",          dialCode: "+40",  vatPrefix: "RO",  eu: true  },
  { code: "SK", name: "Slovakien",         dialCode: "+421", vatPrefix: "SK",  eu: true  },
  { code: "SI", name: "Slovenien",         dialCode: "+386", vatPrefix: "SI",  eu: true  },
  { code: "ES", name: "Spanien",           dialCode: "+34",  vatPrefix: "ES",  eu: true  },
  { code: "GB", name: "Storbritannien",    dialCode: "+44",  vatPrefix: "GB",  eu: false },
  { code: "CZ", name: "Tjeckien",          dialCode: "+420", vatPrefix: "CZ",  eu: true  },
  { code: "DE", name: "Tyskland",          dialCode: "+49",  vatPrefix: "DE",  eu: true  },
  { code: "HU", name: "Ungern",            dialCode: "+36",  vatPrefix: "HU",  eu: true  },
  { code: "AT", name: "Österrike",         dialCode: "+43",  vatPrefix: "AT",  eu: true  },
  // Other common
  { code: "CH", name: "Schweiz",           dialCode: "+41",  vatPrefix: undefined, eu: false },
  { code: "US", name: "USA",               dialCode: "+1",   vatPrefix: undefined, eu: false },
  { code: "CA", name: "Kanada",            dialCode: "+1",   vatPrefix: undefined, eu: false },
  { code: "AU", name: "Australien",        dialCode: "+61",  vatPrefix: undefined, eu: false },
  { code: "JP", name: "Japan",             dialCode: "+81",  vatPrefix: undefined, eu: false },
  { code: "CN", name: "Kina",              dialCode: "+86",  vatPrefix: undefined, eu: false },
]

/** Lookup by ISO alpha-2 code */
export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}

/** Dial code for a country code */
export function getDialCode(countryCode: string): string {
  return getCountry(countryCode)?.dialCode ?? ""
}
