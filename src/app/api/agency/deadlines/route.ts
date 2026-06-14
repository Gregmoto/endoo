/**
 * GET /api/agency/deadlines
 * Returns upcoming and overdue deadlines across all accessible clients.
 * Sources: VatPeriods, FiscalYears, overdue/sent Invoices, expiring SignatureRequests.
 */
import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { getAccessibleClientIds, getClientMap } from "@/lib/agency/access"

export type DeadlineType = "vat" | "fiscal_year" | "invoice" | "signature"

export type DeadlineItem = {
  id:         string
  type:       DeadlineType
  clientId:   string
  clientName: string
  clientSlug: string
  title:      string
  subtitle:   string | null
  date:       string   // ISO date YYYY-MM-DD
  daysLeft:   number   // negative = overdue
  url:        string
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const clientIds = await getAccessibleClientIds(ctx.organizationId, ctx.userId, ctx.role)
    if (clientIds.length === 0) return Response.json({ items: [] })

    const clientMap = await getClientMap(clientIds)

    const today     = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon   = new Date(today)
    horizon.setDate(horizon.getDate() + 90)   // show up to 90 days ahead

    const [vatPeriods, fiscalYears, invoices, signatures] = await Promise.all([
      prisma.vatPeriod.findMany({
        where: {
          organizationId: { in: clientIds },
          status: { in: ["open", "calculated"] },
          periodEnd: { lte: horizon },
        },
        select: {
          id: true, organizationId: true,
          periodStart: true, periodEnd: true, periodType: true, status: true,
        },
        orderBy: { periodEnd: "asc" },
      }),

      prisma.fiscalYear.findMany({
        where: {
          organizationId: { in: clientIds },
          status: "open",
          endDate: { lte: horizon },
        },
        select: {
          id: true, organizationId: true, name: true, endDate: true,
        },
        orderBy: { endDate: "asc" },
      }),

      prisma.invoice.findMany({
        where: {
          organizationId: { in: clientIds },
          status: { in: ["sent", "viewed", "partial", "overdue"] },
          dueDate: { lte: horizon },
          deletedAt: null,
        },
        select: {
          id: true, organizationId: true,
          invoiceNumber: true, dueDate: true, totalAmount: true, currency: true,
          contact: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 200,
      }),

      prisma.signatureRequest.findMany({
        where: {
          organizationId: { in: clientIds },
          status: { in: ["sent", "partially_signed"] },
          expiresAt: { lte: horizon },
        },
        select: {
          id: true, organizationId: true, title: true, expiresAt: true,
        },
        orderBy: { expiresAt: "asc" },
        take: 100,
      }),
    ])

    function daysLeft(d: Date): number {
      const ms = d.getTime() - today.getTime()
      return Math.ceil(ms / 86_400_000)
    }

    const items: DeadlineItem[] = []

    for (const vp of vatPeriods) {
      const c = clientMap.get(vp.organizationId)
      if (!c) continue
      // VAT submission deadline: last day of month following period end (Swedish rule)
      const periodEnd    = new Date(vp.periodEnd)
      const submissionDue = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 2, 12)
      const dl = daysLeft(submissionDue)
      const dateStr = submissionDue.toISOString().slice(0, 10)
      const label = periodEnd.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
      items.push({
        id:         vp.id,
        type:       "vat",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      `Momsdeklaration ${label}`,
        subtitle:   vp.status === "calculated" ? "Beräknad — redo att skickas" : "Ej beräknad",
        date:       dateStr,
        daysLeft:   dl,
        url:        `/${c.slug}/accounting/vat`,
      })
    }

    for (const fy of fiscalYears) {
      const c = clientMap.get(fy.organizationId)
      if (!c) continue
      const dl = daysLeft(new Date(fy.endDate))
      items.push({
        id:         fy.id,
        type:       "fiscal_year",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      `Räkenskapsår ${fy.name} avslutas`,
        subtitle:   null,
        date:       new Date(fy.endDate).toISOString().slice(0, 10),
        daysLeft:   dl,
        url:        `/${c.slug}/accounting/fiscal-years`,
      })
    }

    for (const inv of invoices) {
      const c = clientMap.get(inv.organizationId)
      if (!c) continue
      const dl = daysLeft(new Date(inv.dueDate))
      const amount = new Intl.NumberFormat("sv-SE", {
        style: "currency", currency: inv.currency, maximumFractionDigits: 0,
      }).format(Number(inv.totalAmount) / 100)
      items.push({
        id:         inv.id,
        type:       "invoice",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      inv.contact?.name ?? inv.invoiceNumber ?? "Faktura",
        subtitle:   `${inv.invoiceNumber ? inv.invoiceNumber + " · " : ""}${amount}`,
        date:       new Date(inv.dueDate).toISOString().slice(0, 10),
        daysLeft:   dl,
        url:        `/${c.slug}/invoices/${inv.id}`,
      })
    }

    for (const sr of signatures) {
      const c = clientMap.get(sr.organizationId)
      if (!c) continue
      const dl = daysLeft(new Date(sr.expiresAt))
      items.push({
        id:         sr.id,
        type:       "signature",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      sr.title,
        subtitle:   "Signatur förfaller",
        date:       new Date(sr.expiresAt).toISOString().slice(0, 10),
        daysLeft:   dl,
        url:        `/${c.slug}/signatures/${sr.id}`,
      })
    }

    items.sort((a, b) => a.date.localeCompare(b.date))

    return Response.json({ items })
  } catch (err) {
    const e = err as { name?: string }
    if (e.name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (e.name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[agency/deadlines GET]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
