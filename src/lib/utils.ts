import { type ClassValue, clsx } from "clsx"

/** Merge Tailwind classes safely (requires clsx) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Generate a URL-safe slug from a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

/** Format a date as Swedish short format: 2025-01-15 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE").format(new Date(date))
}

/** Format a date as long Swedish format: 15 januari 2025 */
export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" }).format(new Date(date))
}

/** Convert BigInt amount (öre) to display string */
export function formatMoney(amount: bigint | number, currency = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount) / 100)
}

/** Convert decimal (e.g. 100.50) to BigInt minor units (10050) */
export function toMinorUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 100))
}

/** Convert BigInt minor units to decimal */
export function fromMinorUnits(amount: bigint): number {
  return Number(amount) / 100
}

/** Get initials from a name ("Acme AB" → "AA") */
export function initials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
}

/** Deterministic color from a string (for avatars) */
export function stringToColor(str: string): string {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

/** Assert unreachable branch (exhaustive switch) */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`)
}
