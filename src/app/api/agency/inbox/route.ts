/**
 * GET /api/agency/inbox
 * Returns actionable inbox items across all accessible clients.
 * Items: supplier invoices needing review, approval steps, signature requests, tasks.
 */
import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { getAccessibleClientIds, getClientMap } from "@/lib/agency/access"

export type InboxItemType = "supplier_invoice" | "approval" | "signature" | "task"

export type InboxItem = {
  id:         string
  type:       InboxItemType
  clientId:   string
  clientName: string
  clientSlug: string
  title:      string
  subtitle:   string | null
  dueDate:    string | null
  createdAt:  string
  url:        string
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const clientIds = await getAccessibleClientIds(ctx.organizationId, ctx.userId, ctx.role)
    if (clientIds.length === 0) return Response.json({ items: [] })

    const clientMap = await getClientMap(clientIds)

    // Load user email for signature matching
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    })
    const userEmail = user?.email ?? ""

    const [supplierInvoices, approvalSteps, signerRows, taskAssignments] = await Promise.all([
      // Supplier invoices needing review
      prisma.supplierInvoice.findMany({
        where: {
          organizationId: { in: clientIds },
          status: { in: ["needs_review", "pending_approval"] },
        },
        select: {
          id: true, organizationId: true,
          supplierName: true, amountInclVat: true, currency: true,
          dueDate: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      // Approval steps where this user is a resolver
      prisma.approvalStep.findMany({
        where: {
          organizationId: { in: clientIds },
          status: "active",
          resolvedApproverIds: { has: ctx.userId },
        },
        select: {
          id: true, organizationId: true, name: true, activatedAt: true,
          request: {
            select: {
              id: true,
              supplierInvoice: { select: { supplierName: true, amountInclVat: true } },
            },
          },
        },
        orderBy: { activatedAt: "asc" },
        take: 100,
      }),

      // Signature requests where user's email is a pending signer
      userEmail
        ? prisma.signer.findMany({
            where: {
              email: userEmail,
              status: "pending",
              signatureRequest: {
                organizationId: { in: clientIds },
                status: { in: ["sent", "partially_signed"] },
              },
            },
            select: {
              id: true,
              signatureRequest: {
                select: {
                  id: true, organizationId: true, title: true,
                  expiresAt: true, createdAt: true,
                },
              },
            },
            take: 100,
          })
        : Promise.resolve([]),

      // Tasks assigned to this user
      prisma.taskAssignment.findMany({
        where: {
          userId: ctx.userId,
          organizationId: { in: clientIds },
          task: {
            status: { in: ["open", "in_progress"] },
            deletedAt: null,
          },
        },
        select: {
          id: true,
          task: {
            select: {
              id: true, organizationId: true, title: true,
              dueDate: true, priority: true, createdAt: true,
            },
          },
        },
        orderBy: { assignedAt: "asc" },
        take: 100,
      }),
    ])

    const items: InboxItem[] = []

    for (const si of supplierInvoices) {
      const c = clientMap.get(si.organizationId)
      if (!c) continue
      const amount = si.amountInclVat != null
        ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: si.currency, maximumFractionDigits: 0 })
            .format(Number(si.amountInclVat) / 100)
        : null
      items.push({
        id:         si.id,
        type:       "supplier_invoice",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      si.supplierName ?? "Okänd leverantör",
        subtitle:   amount,
        dueDate:    si.dueDate ? si.dueDate.toISOString().slice(0, 10) : null,
        createdAt:  si.createdAt.toISOString(),
        url:        `/${c.slug}/supplier-invoices/${si.id}`,
      })
    }

    for (const step of approvalSteps) {
      const c = clientMap.get(step.organizationId)
      if (!c) continue
      const inv = step.request.supplierInvoice
      const amount = inv?.amountInclVat != null
        ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 })
            .format(Number(inv.amountInclVat) / 100)
        : null
      items.push({
        id:         step.id,
        type:       "approval",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      inv?.supplierName ?? step.name,
        subtitle:   amount ? `Attest — ${amount}` : `Attest: ${step.name}`,
        dueDate:    null,
        createdAt:  (step.activatedAt ?? new Date()).toISOString(),
        url:        `/${c.slug}/supplier-invoices/${step.request.id}`,
      })
    }

    for (const signer of signerRows) {
      const sr = signer.signatureRequest
      const c  = clientMap.get(sr.organizationId)
      if (!c) continue
      items.push({
        id:         signer.id,
        type:       "signature",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      sr.title,
        subtitle:   "Väntar på din signatur",
        dueDate:    sr.expiresAt.toISOString().slice(0, 10),
        createdAt:  sr.createdAt.toISOString(),
        url:        `/${c.slug}/signatures/${sr.id}`,
      })
    }

    for (const ta of taskAssignments) {
      const t = ta.task
      const c = clientMap.get(t.organizationId)
      if (!c) continue
      items.push({
        id:         t.id,
        type:       "task",
        clientId:   c.id,
        clientName: c.name,
        clientSlug: c.slug,
        title:      t.title,
        subtitle:   null,
        dueDate:    t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        createdAt:  t.createdAt.toISOString(),
        url:        `/${c.slug}/tasks/${t.id}`,
      })
    }

    // Sort: items with closest dueDate first, null dueDate last, then by createdAt desc
    items.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return b.createdAt.localeCompare(a.createdAt)
    })

    return Response.json({ items })
  } catch (err) {
    const e = err as { name?: string }
    if (e.name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (e.name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[agency/inbox GET]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
