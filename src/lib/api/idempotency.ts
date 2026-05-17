import { prisma }       from "@/lib/prisma"
import { createHash }   from "crypto"

export function hashBody(body: string): string {
  return createHash("sha256").update(body).digest("hex")
}

export async function checkIdempotency(
  organizationId: string,
  key: string,
  method: string,
  path: string,
  requestHash: string,
): Promise<{ hit: boolean; statusCode?: number; responseBody?: unknown }> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { organizationId_key: { organizationId, key } },
  })

  if (!existing) return { hit: false }

  if (existing.requestHash !== requestHash) {
    // Same key, different body — conflict
    return { hit: true, statusCode: 422, responseBody: { error: "Idempotency key reused with different request body" } }
  }

  if (existing.responseBody === null) {
    // Key exists but response not yet stored (in-flight request) — return 409
    return { hit: true, statusCode: 409, responseBody: { error: "Request with this idempotency key is already in progress" } }
  }

  return { hit: true, statusCode: existing.statusCode ?? 200, responseBody: existing.responseBody }
}

export async function storeIdempotency(
  organizationId: string,
  key: string,
  method: string,
  path: string,
  requestHash: string,
  statusCode: number,
  responseBody: unknown,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.idempotencyKey.upsert({
    where:  { organizationId_key: { organizationId, key } },
    create: { organizationId, key, method, path, requestHash, statusCode, responseBody: responseBody as never, expiresAt },
    update: { statusCode, responseBody: responseBody as never },
  })
}

export async function reserveIdempotency(
  organizationId: string,
  key: string,
  method: string,
  path: string,
  requestHash: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.idempotencyKey.create({
    data: { organizationId, key, method, path, requestHash, expiresAt },
  })
}
