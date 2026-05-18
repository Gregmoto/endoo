/**
 * Portal invoices list.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link         from "next/link"

const STATUS_LABEL: Record<string, string> = {
  draft:    "Utkast",
  sent:     "Skickad",
  viewed:   "Visad",
  overdue:  "Förfallen",
  paid:     "Betald",
  partial:  "Delbetald",
  void:     "Makulerad",
  credited: "Krediterad",
}

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  let claims: Awaited<ReturnType<typeof requirePortalAuth>>
  try {
    claims = await requirePortalAuth(orgSlug)
  } catch (err) {
    if (err instanceof PortalAuthError) redirect(`/portal/${orgSlug}/login`)
    throw err
  }

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: claims.orgId, contactId: claims.sub },
    select: { id: true, invoiceNumber: true, status: true, totalAmount: true, currency: true, issueDate: true, dueDate: true },
    orderBy: { issueDate: "desc" },
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <Link href={`/portal/${orgSlug}`} style={backLink}>← Hem</Link>
        <h1 style={h1}>Fakturor</h1>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground">Inga fakturor hittades.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoices.map(inv => (
            <Link key={inv.id} href={`/portal/${orgSlug}/invoices/${inv.id}`} style={row}>
              <div>
                <span style={{ fontWeight: 600 }}>{inv.invoiceNumber}</span>
                <StatusBadge status={inv.status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                Utfärdad {new Date(inv.issueDate).toLocaleDateString("sv-SE")} · Förfaller {new Date(inv.dueDate).toLocaleDateString("sv-SE")}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>
                {(Number(inv.totalAmount) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {inv.currency}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid:    "#dcfce7", // audit-ok
    void:    "#f3f4f6", // audit-ok
    overdue: "#fee2e2", // audit-ok
  }
  const textColors: Record<string, string> = {
    paid:    "#16a34a", // audit-ok
    void:    "#6b7280", // audit-ok
    overdue: "#dc2626", // audit-ok
  }
  return (
    <span style={{ marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: colors[status] ?? "#eff6ff", color: textColors[status] ?? "#1d4ed8" }}> {/* audit-ok */}
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

const h1: React.CSSProperties      = { margin: 0, fontSize: 22, fontWeight: 700, color: "var(--foreground)" }
const backLink: React.CSSProperties = { color: "var(--primary)", textDecoration: "none", fontSize: 14 }
const row: React.CSSProperties     = { display: "block", background: "var(--card)", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.07)", textDecoration: "none", color: "inherit" }
