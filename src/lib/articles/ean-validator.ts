export function generateEan13Check(first12: string): number {
  if (!/^\d{12}$/.test(first12)) return -1
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10)
    sum += i % 2 === 0 ? digit : digit * 3
  }
  return (10 - (sum % 10)) % 10
}

export function validateEan13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false
  const check = generateEan13Check(ean.slice(0, 12))
  return check === parseInt(ean[12], 10)
}

export function formatEan(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 12) return digits.padStart(13, "0")
  if (digits.length === 12) {
    const check = generateEan13Check(digits)
    return digits + check
  }
  return digits.slice(0, 13)
}
