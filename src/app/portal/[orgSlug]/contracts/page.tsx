/**
 * Portal contracts list.
 */

import { requirePortalAuth, PortalAuthError } from "@/lib/portal/auth"
import { prisma }   from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link         from "next/link"

const FREQ_LABEL: Record<string, string> = {
  monthly:   "Månadsvis",
  quarterly: "Kvartalsvis",
  yearly:    "Årsvis",
  weekly:    "Veckovis",
}

const STATUS_LABEL: Record<string, string> = {
  active:    "Aktiv",
  paused:    "Pausad",
  cancelled: "Avslutad",
  draft:     "Utkast",
}

export default async function PortalContractsPage({
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

  const contracts = await prisma.recurringSchedule.findMany({
    where: { organizationId: claims.orgId, contactId: claims.sub, deletedAt: null, status: { notIn: ["draft"] } },
    select: { id: true, contractNumber: true, name: true, status: true, frequency: true, startDate: true, endDate: true, nextIssueDate: true, currency: true },
    orderBy: { startDate: "desc" },
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <Link href={`/portal/${orgSlug}`} style={backLink}>← Hem</Link>
        <h1 style={h1}>Avtal</h1>
      </div>

      {contracts.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Inga aktiva avtal hittades.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contracts.map(c => (
            <div key={c.id} style={row}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{c.contractNumber ?? c.name}</span>
                {c.contractNumber && <span style={{ color: "#6b7280", fontSize: 13 }}>— {c.name}</span>}
                <StatusBadge status={c.status} />
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, display: "flex", gap: 16 }}>
                <span>{FREQ_LABEL[c.frequency] ?? c.frequency}</span>
                <span>Startade {new Date(c.startDate).toLocaleDateString("sv-SE")}</span>
                {c.endDate && <span>Slutar {new Date(c.endDate).toLocaleDateString("sv-SE")}</span>}
                {c.status === "active" && (
                  <span>Nästa faktura {new Date(c.nextIssueDate).toLocaleDateString("sv-SE")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    active:    ["#dcfce7", "#16a34a"],
    paused:    ["#fefce8", "#92400e"],
    cancelled: ["#f3f4f6", "#6b7280"],
  }
  const [bg, fg] = colors[status] ?? ["#eff6ff", "#1d4ed8"]
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: bg, color: fg }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

const h1: React.CSSProperties      = { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }
const backLink: React.CSSProperties = { color: "#4f46e5", textDecoration: "none", fontSize: 14 }
const row: React.CSSProperties     = { background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }
