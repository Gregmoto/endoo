export type SieKtyp = "T" | "S" | "E" | "I" | "K"

export type SieAccount = {
  number: string
  name:   string
  ktyp:   SieKtyp
  ib:     number  // SEK decimal
  ub:     number  // SEK decimal
}

export type SieTrans = {
  accountNumber: string
  amount:        number  // SEK decimal, negative = credit
}

export type SieVer = {
  series:      string
  number:      number
  date:        string  // YYYYMMDD
  description: string
  regDate:     string  // YYYYMMDD
  trans:       SieTrans[]
}

export type SieDocument = {
  program:   string
  version:   string
  generated: string  // YYYYMMDD
  orgNumber: string
  orgName:   string
  rarStart:  string  // YYYYMMDD
  rarEnd:    string  // YYYYMMDD
  accounts:  SieAccount[]
  vers:      SieVer[]
}
