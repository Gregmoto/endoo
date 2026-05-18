// Generic CRUD helpers for invoicing settings tables (PaymentTerm, Unit, OrgCurrency, etc.)
// All tables share the same shape: { id, organizationId, code, name, isActive, isDefault, ... }

import { prisma }         from "@/lib/prisma"
import type { RBACContext } from "@/lib/rbac/context"

type SupportedModel =
  | "paymentTerm"
  | "unit"
  | "orgCurrency"
  | "deliveryMethod"
  | "deliveryTerms"
  | "invoiceTemplate2"

// Prisma client accessor by model name
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDelegate(model: SupportedModel): any {
  return (prisma as unknown as Record<string, unknown>)[model]
}

export async function listItems(model: SupportedModel, ctx: RBACContext) {
  return getDelegate(model).findMany({
    where:   { organizationId: ctx.organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
}

export async function createItem(
  model:   SupportedModel,
  ctx:     RBACContext,
  data:    Record<string, unknown>
) {
  // If this item is being set as default, clear existing default first
  if (data.isDefault) {
    await getDelegate(model).updateMany({
      where:  { organizationId: ctx.organizationId, isDefault: true },
      data:   { isDefault: false },
    })
  }
  return getDelegate(model).create({
    data: { ...data, organizationId: ctx.organizationId },
  })
}

export async function updateItem(
  model: SupportedModel,
  ctx:   RBACContext,
  id:    string,
  data:  Record<string, unknown>
) {
  const existing = await getDelegate(model).findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!existing) return null

  if (data.isDefault) {
    await getDelegate(model).updateMany({
      where: { organizationId: ctx.organizationId, isDefault: true, id: { not: id } },
      data:  { isDefault: false },
    })
  }

  return getDelegate(model).update({ where: { id }, data })
}

export async function deleteItem(
  model: SupportedModel,
  ctx:   RBACContext,
  id:    string
) {
  const existing = await getDelegate(model).findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!existing) return null
  return getDelegate(model).delete({ where: { id } })
}
