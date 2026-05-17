/**
 * Seeds the three built-in dimension axes for a new organization.
 * Idempotent — safe to call multiple times (upsert).
 *
 * Built-in axes:
 *   cc      — Kostnadsställe (cost center)
 *   project — Projekt
 *   unit    — Resultatenhet (profit center)
 */

import { prisma } from "@/lib/prisma"

const BUILT_IN_AXES = [
  { code: "cc",      name: "Kostnadsställe", sortOrder: 0 },
  { code: "project", name: "Projekt",        sortOrder: 1 },
  { code: "unit",    name: "Resultatenhet",  sortOrder: 2 },
]

export async function seedBuiltInAxes(organizationId: string): Promise<void> {
  for (const axis of BUILT_IN_AXES) {
    await prisma.dimensionAxis.upsert({
      where: { organizationId_code: { organizationId, code: axis.code } },
      update: {},
      create: {
        organizationId,
        code:      axis.code,
        name:      axis.name,
        isBuiltIn: true,
        isRequired: false,
        isActive:  true,
        sortOrder: axis.sortOrder,
      },
    })
  }
}
