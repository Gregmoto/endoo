/**
 * GET /api/agency/clients
 * Returns ClientSnapshot[] for all active clients of the current agency.
 * Falls back to raw relationship data if no snapshot exists yet.
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const { searchParams } = req.nextUrl
    const search = searchParams.get("search") ?? ""
    const filter = searchParams.get("filter") ?? "all"    // all | action_needed | missing_docs | at_risk
    const sort   = searchParams.get("sort")   ?? "health" // health | name | activity | vat

    const relationships = await prisma.agencyClientRelationship.findMany({
      where: { agencyId: ctx.organizationId, status: "active" },
      select: { clientId: true },
    })
    const clientIds = relationships.map(r => r.clientId)
    if (clientIds.length === 0) return Response.json({ clients: [], kpis: emptyKpis() })

    // Load snapshots (may not exist for all clients yet)
    const snapshots = await prisma.clientSnapshot.findMany({
      where: { agencyId: ctx.organizationId, clientId: { in: clientIds } },
    })

    // Clients without snapshots yet — create in-memory stubs
    const snapshotIds = new Set(snapshots.map(s => s.clientId))
    const missingIds  = clientIds.filter(id => !snapshotIds.has(id))
    const now         = new Date()

    let stubs: typeof snapshots = []
    if (missingIds.length) {
      const orgs = await prisma.organization.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, name: true, slug: true },
      })
      stubs = orgs.map(o => ({
        id: `stub-${o.id}`, agencyId: ctx.organizationId, clientId: o.id,
        clientName: o.name, clientSlug: o.slug,
        healthScore: 0, overdueInvoiceCount: 0, overdueAmountOre: BigInt(0),
        unbookedSupplierCount: 0, openAiAnomalyCount: 0, pendingAiSuggestionCount: 0,
        openTaskCount: 0, overdueTaskCount: 0,
        daysSinceLastActivity: null, nextVatDeadlineAt: null, vatDeadlineDaysLeft: null,
        fiscalYearEndsAt: null, fiscalYearDaysLeft: null,
        onboardingDone: false, onboardingChecks: {}, alerts: [], alertCount: 0,
        errorCount: 0, warningCount: 0, computedAt: now, updatedAt: now,
      }))
    }

    let all = [...snapshots, ...stubs]

    // Search
    if (search) {
      const q = search.toLowerCase()
      all = all.filter(s => s.clientName.toLowerCase().includes(q))
    }
    // Filter
    if (filter === "action_needed") all = all.filter(s => s.alertCount > 0)
    if (filter === "missing_docs")  all = all.filter(s => s.unbookedSupplierCount > 0)
    if (filter === "at_risk")       all = all.filter(s => s.healthScore < 60)
    // Sort
    if (sort === "health")   all.sort((a, b) => a.healthScore - b.healthScore)
    if (sort === "name")     all.sort((a, b) => a.clientName.localeCompare(b.clientName, "sv"))
    if (sort === "activity") all.sort((a, b) => (b.daysSinceLastActivity ?? 999) - (a.daysSinceLastActivity ?? 999))
    if (sort === "vat")      all.sort((a, b) => (a.vatDeadlineDaysLeft ?? 999) - (b.vatDeadlineDaysLeft ?? 999))

    const clients = all.map(s => ({ ...s, overdueAmountOre: Number(s.overdueAmountOre) }))

    const kpis = {
      totalClients:     clients.length,
      actionNeeded:     clients.filter(c => c.alertCount > 0).length,
      missingDocs:      clients.filter(c => c.unbookedSupplierCount > 0).length,
      atRisk:           clients.filter(c => c.healthScore < 60).length,
      vatDueSoon:       clients.filter(c => c.vatDeadlineDaysLeft != null && c.vatDeadlineDaysLeft <= 30).length,
      totalAiAnomalies: clients.reduce((s, c) => s + c.openAiAnomalyCount, 0),
      avgHealthScore:   clients.length
        ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length) : 0,
    }

    return Response.json({ clients, kpis })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthenticated") return Response.json({ error: "Unauthorized" }, { status: 401 })
      if (err.message === "Unauthorized")    return Response.json({ error: "Forbidden" },    { status: 403 })
    }
    console.error("[agency/clients GET]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

function emptyKpis() {
  return { totalClients: 0, actionNeeded: 0, missingDocs: 0, atRisk: 0, vatDueSoon: 0, totalAiAnomalies: 0, avgHealthScore: 0 }
}
