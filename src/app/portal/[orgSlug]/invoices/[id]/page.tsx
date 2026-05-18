/**
 * Portal invoice detail.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link         from "next/link"

export default async function PortalInvoiceDetailPage({
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

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: claims.orgId, contactId: claims.sub },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments:  { orderBy: { paymentDate: "asc" } },
    },
  })

  if (!invoice) redirect(`/portal/${orgSlug}/invoices`)

  const balanceDue = Number(invoice.totalAmount) - Number(invoice.paidAmount)

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <Link href={`/portal/${orgSlug}/invoices`} style={backLink}>← Fakturor</Link>
        <h1 style={h1}>{invoice.invoiceNumber}</h1>
        <a
          href={`/api/portal/${orgSlug}/invoices/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={pdfBtn}
        >
          Ladda ner PDF
        </a>
      </div>

      {/* Meta */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <MetaItem label="Utfärdad"  value={new Date(invoice.issueDate).toLocaleDateString("sv-SE")} />
        <MetaItem label="Förfaller" value={new Date(invoice.dueDate).toLocaleDateString("sv-SE")} />
        <MetaItem label="Status"    value={invoice.status} />
      </div>

      {/* Line items */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={h2}>Rader</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Beskrivning", "Antal", "À-pris", "Summa"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", padding: "6px 8px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--muted)" }}>
                <td style={td}>{l.description}</td>
                <td style={td}>{Number(l.quantity)} {l.unit}</td>
                <td style={td}>{(Number(l.unitPrice) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                <td style={td}>{(Number(l.lineTotal) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 220 }}>
            <TotalRow label="Netto"  value={Number(invoice.subtotalAmount)} currency={invoice.currency} />
            <TotalRow label="Moms"   value={Number(invoice.taxAmount)}      currency={invoice.currency} />
            {Number(invoice.discountAmount) > 0 && (
              <TotalRow label="Rabatt" value={-Number(invoice.discountAmount)} currency={invoice.currency} />
            )}
            <div style={{ borderTop: "2px solid var(--foreground)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Totalt</span>
              <span>{(Number(invoice.totalAmount) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {invoice.currency}</span>
            </div>
            {Number(invoice.paidAmount) > 0 && (
              <TotalRow label="Betalt" value={-Number(invoice.paidAmount)} currency={invoice.currency} />
            )}
            {balanceDue > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--destructive)", fontWeight: 700, marginTop: 4 }}>
                <span>Att betala</span>
                <span>{(balanceDue / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {invoice.currency}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <div style={card}>
          <h2 style={h2}>Betalningar</h2>
          {invoice.payments.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--muted)", fontSize: 14 }}>
              <span>{new Date(p.paymentDate).toLocaleDateString("sv-SE")} · {p.method}</span>
              <span style={{ fontWeight: 600 }}>{(Number(p.amount) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {invoice.currency}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
    </div>
  )
}

function TotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted-foreground)", padding: "3px 0" }}>
      <span>{label}</span>
      <span>{(value / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {currency}</span>
    </div>
  )
}

const h1: React.CSSProperties      = { margin: 0, fontSize: 22, fontWeight: 700, color: "var(--foreground)", flex: 1 }
const h2: React.CSSProperties      = { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--foreground)" }
const backLink: React.CSSProperties = { color: "var(--primary)", textDecoration: "none", fontSize: 14 }
const card: React.CSSProperties    = { background: "var(--card)", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }
const pdfBtn: React.CSSProperties  = { padding: "8px 16px", background: "var(--primary)", color: "var(--background)", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }
const td: React.CSSProperties      = { padding: "8px", fontSize: 13, color: "var(--foreground)" }
