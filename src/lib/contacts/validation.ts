/**
 * Swedish org number (organisationsnummer) Luhn validation.
 * Accepts formats: 5565671234, 556567-1234, 55656712-34
 */
export function validateSwedishOrgNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 10) return false
  return luhn10(digits)
}

/**
 * Swedish personal number (personnummer) validation.
 * Accepts YYYYMMDD-NNNN and YYYYMMDDNNNN.
 */
export function validateSwedishPersonalNumber(value: string): boolean {
  const cleaned = value.replace(/\D/g, "")
  if (cleaned.length !== 12) return false
  const year  = parseInt(cleaned.slice(0, 4))
  const month = parseInt(cleaned.slice(4, 6))
  const day   = parseInt(cleaned.slice(6, 8))
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  // Validate Luhn on last 10 digits (YYMMDDNNNN)
  return luhn10(cleaned.slice(2))
}

/**
 * EU VAT number format validation (basic — not VIES live check).
 * Returns true if format looks plausible for the given country.
 */
export function validateVatNumberFormat(vatNumber: string, country: string): boolean {
  const v = vatNumber.trim().toUpperCase().replace(/\s/g, "")
  const patterns: Record<string, RegExp> = {
    SE: /^SE\d{12}$/,
    DK: /^DK\d{8}$/,
    NO: /^NO\d{9}MVA$/,
    FI: /^FI\d{8}$/,
    DE: /^DE\d{9}$/,
    FR: /^FR[A-Z0-9]{2}\d{9}$/,
    NL: /^NL\d{9}B\d{2}$/,
    BE: /^BE0\d{9}$/,
    GB: /^GB(\d{9}|\d{12}|(GD|HA)\d{3})$/,
    PL: /^PL\d{10}$/,
    IT: /^IT\d{11}$/,
    ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    AT: /^ATU\d{8}$/,
    CH: /^CHE-\d{3}\.\d{3}\.\d{3}(MVA|MWST|IVA)?$/,
  }
  const pattern = patterns[country]
  if (pattern) return pattern.test(v)
  // Generic: starts with 2 letters then alphanumeric
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v)
}

/** Luhn algorithm for 10-digit strings */
function luhn10(digits: string): boolean {
  if (digits.length !== 10) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let d = parseInt(digits[i])
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  const check = (10 - (sum % 10)) % 10
  return check === parseInt(digits[9])
}
