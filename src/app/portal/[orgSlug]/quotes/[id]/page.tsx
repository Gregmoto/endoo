/**
 * Portal quote detail.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link         from "next/link"

type RawLine = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

export default async function PortalQuoteDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try {
    claims = await requirePortalAuth(orgSlug)
  } catch (err) {
    if (err instanceof PortalAuthError) redirect(`/portal/${orgSlug}/login`)
    throw err
  }

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: claims.orgId, contactId: claims.sub, status: { notIn: ["draft", "cancelled"] } },
  })

  if (!quote) redirect(`/portal/${orgSlug}/quotes`)

  const lines = (Array.isArray(quote.lineItems) ? quote.lineItems : []) as RawLine[]

  let subtotalKr = 0, taxKr = 0, discountKr = 0
  for (const l of lines) {
    const gross = l.quantity * (l.unitPriceKr ?? 0)
    const net   = gross * (1 - (l.discountRate ?? 0))
    discountKr += gross - net
    subtotalKr += net
    taxKr      += net * (l.taxRate ?? 0.25)
  }
  const totalKr = subtotalKr + taxKr
  const cur = quote.currency

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <Link href={`/portal/${orgSlug}/quotes`} style={backLink}>← Offerter</Link>
        <h1 style={h1}>{quote.number}{quote.title ? ` — ${quote.title}` : ""}</h1>
        <a
          href={`/api/portal/${orgSlug}/quotes/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={pdfBtn}
        >
          Ladda ner PDF
        </a>
      </div>

      {/* Meta */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <MetaItem label="Datum"     value={new Date(quote.createdAt).toLocaleDateString("sv-SE")} />
        <MetaItem label="Giltig t.o.m." value={quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("sv-SE") : "—"} />
        <MetaItem label="Status"    value={quote.status} />
      </div>

      {/* Line items */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={h2}>Rader</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              {["Beskrivning", "Antal", "À-pris", "Summa"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "#6b7280", padding: "6px 8px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={td}>{l.description}</td>
                <td style={td}>{l.quantity} {l.unit ?? "st"}</td>
                <td style={td}>{(l.unitPriceKr ?? 0).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                <td style={td}>{((l.quantity * (l.unitPriceKr ?? 0)) * (1 - (l.discountRate ?? 0))).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 220 }}>
            <TotalRow label="Netto"  value={subtotalKr} currency={cur} />
            {discountKr > 0 && <TotalRow label="Rabatt" value={-discountKr} currency={cur} />}
            <TotalRow label="Moms"   value={taxKr} currency={cur} />
            <div style={{ borderTop: "2px solid #111827", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Totalt</span>
              <span>{totalKr.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {cur}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes / terms */}
      {(quote.notes || quote.terms) && (
        <div style={card}>
          {quote.notes && (
            <div style={{ marginBottom: quote.terms ? 16 : 0 }}>
              <div style={metaLabel}>Kommentar</div>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div>
              <div style={metaLabel}>Villkor</div>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{quote.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={metaLabel}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
    </div>
  )
}

function TotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280", padding: "3px 0" }}>
      <span>{label}</span>
      <span>{value.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {currency}</span>
    </div>
  )
}

const h1: React.CSSProperties       = { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827", flex: 1 }
const h2: React.CSSProperties       = { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#111827" }
const backLink: React.CSSProperties  = { color: "#4f46e5", textDecoration: "none", fontSize: 14 }
const card: React.CSSProperties     = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }
const pdfBtn: React.CSSProperties   = { padding: "8px 16px", background: "#4f46e5", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }
const td: React.CSSProperties       = { padding: "8px", fontSize: 13, color: "#374151" }
const metaLabel: React.CSSProperties = { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }
