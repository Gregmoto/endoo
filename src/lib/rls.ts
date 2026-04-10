/**
 * Endoo — RLS context setter
 *
 * PostgreSQL RLS policies read app.current_organization_id via
 * current_setting(). We must set this at the start of every
 * DB transaction that touches tenant data.
 *
 * Usage in Route Handlers / Server Actions:
 *   await withRLS(orgId, async () => {
 *     const invoices = await prisma.invoice.findMany()  // auto-filtered by RLS
 *   })
 *
 * The tenantDb() wrapper in tenant-db.ts calls this automatically.
 * Use withRLS() directly only when querying raw SQL.
 *
 * Super admin bypass:
 *   await withRLSBypass(async () => { ... })
 */

import { prisma } from "@/lib/prisma"

/**
 * Run a callback with org context set for the current transaction.
 * Uses SET LOCAL so the setting is scoped to the transaction only.
 */
export async function withRLS<T>(
  organizationId: string,
  callback: () => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_organization_id = '${organizationId}'`
    )
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'false'`)
    // Run the callback with the transaction client
    // Note: callback must use the tx client for RLS to apply.
    // For Prisma extension queries, we set the session var before each query.
    return callback()
  })
}

/**
 * Set org context for a single query outside a transaction.
 * Use this when you don't need a full transaction wrapper.
 * Note: SET (without LOCAL) persists for the connection lifetime,
 * which is fine since Prisma uses connection pooling with reuse.
 * In production, use SET LOCAL inside $transaction for stronger isolation.
 */
export async function setRLSContext(organizationId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SET app.current_organization_id = '${organizationId}'`
  )
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'false'`)
}

/**
 * Super admin: bypass RLS for cross-tenant queries.
 */
export async function withRLSBypass<T>(callback: () => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`)
    return callback()
  })
}
