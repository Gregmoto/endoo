/**
 * Portal home — shows unpaid invoice summary and quick links.
 * Redirects to login if not authenticated.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }    from "@/lib/prisma"
import { redirect }  from "next/navigation"
import Link          from "next/link"

export default async function PortalHomePage({
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

  const [invoices, quotes, contracts] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: claims.orgId, contactId: claims.sub, status: { in: ["sent", "overdue"] } },
      select: { id: true, invoiceNumber: true, totalAmount: true, currency: true, dueDate: true, status: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { organizationId: claims.orgId, contactId: claims.sub, status: { in: ["sent", "viewed"] } },
      select: { id: true, number: true, title: true, validUntil: true },
      orderBy: { sentAt: "desc" },
      take: 3,
    }),
    prisma.recurringSchedule.count({
      where: { organizationId: claims.orgId, contactId: claims.sub, deletedAt: null, status: "active" },
    }),
  ])

  const unpaidTotal = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

  return (
    <div>
      <h1 style={h1}>Välkommen, {claims.email}</h1>

      {/* Unpaid invoices */}
      {invoices.length > 0 && (
        <section style={section}>
          <div style={sectionHeader}>
            <h2 style={h2}>Obetald faktura ({invoices.length})</h2>
            <span style={{ fontSize: 14, color: "var(--destructive)", fontWeight: 600 }}>
              Totalt: {(unpaidTotal / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {invoices[0]?.currency}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoices.map(inv => (
              <Link key={inv.id} href={`/portal/${orgSlug}/invoices/${inv.id}`} style={card}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{inv.invoiceNumber}</span>
                  <span style={{ marginLeft: 12, fontSize: 12, color: inv.status === "overdue" ? "var(--destructive)" : "var(--muted-foreground)" }}>
                    Förfaller {inv.dueDate instanceof Date ? inv.dueDate.toLocaleDateString("sv-SE") : String(inv.dueDate)}
                    {inv.status === "overdue" && " · Förfallen"}
                  </span>
                </div>
                <span style={{ fontWeight: 600 }}>
                  {(Number(inv.totalAmount) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {inv.currency}
                </span>
              </Link>
            ))}
          </div>
          <Link href={`/portal/${orgSlug}/invoices`} style={moreLink}>Visa alla fakturor →</Link>
        </section>
      )}

      {/* Pending quotes */}
      {quotes.length > 0 && (
        <section style={section}>
          <h2 style={h2}>Offerter som väntar på svar</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quotes.map(q => (
              <Link key={q.id} href={`/portal/${orgSlug}/quotes/${q.id}`} style={card}>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{q.number} {q.title ? `— ${q.title}` : ""}</span>
                {q.validUntil && (
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Giltig t.o.m. {new Date(q.validUntil).toLocaleDateString("sv-SE")}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <Link href={`/portal/${orgSlug}/quotes`} style={moreLink}>Visa alla offerter →</Link>
        </section>
      )}

      {/* Quick nav */}
      <section style={{ ...section, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <NavCard href={`/portal/${orgSlug}/invoices`} label="Fakturor" />
        <NavCard href={`/portal/${orgSlug}/quotes`}   label="Offerter" />
        <NavCard href={`/portal/${orgSlug}/contracts`} label={`Avtal${contracts > 0 ? ` (${contracts})` : ""}`} />
      </section>

      {/* Logout */}
      <form action={`/api/portal/${orgSlug}/auth/logout`} method="POST" style={{ marginTop: 32, textAlign: "center" }}>
        <button type="submit" style={logoutBtn}>Logga ut</button>
      </form>
    </div>
  )
}

function NavCard({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ display: "block", background: "var(--card)", borderRadius: 10, padding: "20px 16px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,.07)", textDecoration: "none", color: "var(--foreground)", fontWeight: 600, fontSize: 15 }}>
      {label}
    </Link>
  )
}

const h1: React.CSSProperties         = { margin: "0 0 24px", fontSize: 24, fontWeight: 700, color: "var(--foreground)" }
const h2: React.CSSProperties         = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground)" }
const section: React.CSSProperties    = { background: "var(--card)", borderRadius: 12, padding: "24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }
const sectionHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }
const card: React.CSSProperties       = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--muted)", borderRadius: 8, textDecoration: "none", color: "inherit" }
const moreLink: React.CSSProperties   = { display: "inline-block", marginTop: 12, fontSize: 13, color: "var(--primary)", textDecoration: "none" }
const logoutBtn: React.CSSProperties  = { background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 20px", fontSize: 13, color: "var(--muted-foreground)", cursor: "pointer" }
