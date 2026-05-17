/**
 * Portal quotes list.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link         from "next/link"

const STATUS_LABEL: Record<string, string> = {
  sent:       "Skickad",
  viewed:     "Visad",
  accepted:   "Accepterad",
  declined:   "Avslagen",
  expired:    "Utgången",
  invoiced:   "Fakturerad",
  contracted: "Avtal",
}

export default async function PortalQuotesPage({
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

  const quotes = await prisma.quote.findMany({
    where: { organizationId: claims.orgId, contactId: claims.sub, status: { notIn: ["draft", "cancelled"] } },
    select: { id: true, number: true, title: true, status: true, currency: true, validUntil: true, sentAt: true },
    orderBy: { sentAt: "desc" },
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <Link href={`/portal/${orgSlug}`} style={backLink}>← Hem</Link>
        <h1 style={h1}>Offerter</h1>
      </div>

      {quotes.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Inga offerter hittades.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quotes.map(q => (
            <Link key={q.id} href={`/portal/${orgSlug}/quotes/${q.id}`} style={row}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{q.number}</span>
                {q.title && <span style={{ color: "#6b7280", fontSize: 13 }}>— {q.title}</span>}
                <StatusBadge status={q.status} />
              </div>
              {q.validUntil && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Giltig t.o.m. {new Date(q.validUntil).toLocaleDateString("sv-SE")}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    accepted:   ["#dcfce7", "#16a34a"],
    declined:   ["#fee2e2", "#dc2626"],
    expired:    ["#f3f4f6", "#6b7280"],
    invoiced:   ["#f0fdf4", "#15803d"],
    contracted: ["#eff6ff", "#1d4ed8"],
  }
  const [bg, fg] = colors[status] ?? ["#fefce8", "#92400e"]
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: bg, color: fg }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

const h1: React.CSSProperties      = { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }
const backLink: React.CSSProperties = { color: "#4f46e5", textDecoration: "none", fontSize: 14 }
const row: React.CSSProperties     = { display: "block", background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.07)", textDecoration: "none", color: "inherit" }
