export function nextDate(current: Date, frequency: string): Date {
  const d = new Date(current)
  switch (frequency) {
    case "weekly":    d.setDate(d.getDate() + 7);   break
    case "biweekly":  d.setDate(d.getDate() + 14);  break
    case "monthly":   d.setMonth(d.getMonth() + 1); break
    case "quarterly": d.setMonth(d.getMonth() + 3); break
    case "yearly":    d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

export function calcLineTotal(quantity: number, unitPrice: number, discountRate: number): number {
  return Math.round(quantity * unitPrice * (1 - discountRate))
}

export function calcTaxAmount(lineTotal: number, taxRate: number): number {
  return Math.round(lineTotal * taxRate)
}
