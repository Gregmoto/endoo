/**
 * Connection service — lifecycle management for integration connections.
 *
 * Credentials are encrypted with AES-256-GCM before being stored.
 * The per-connection IV lives in Connection.encryptionIv.
 */

import { prisma }             from "@/lib/prisma"
import { generateIv, encryptNullable, decryptNullable } from "@/lib/integrations/encryption"
import { getConnector }       from "@/lib/integrations/registry"
import type { Connection }    from "@prisma/client"

// ─── Error types ──────────────────────────────────────────────────────────────

export class ConnectionNotFoundError extends Error {
  constructor(id: string) { super(`Connection not found: ${id}`); this.name = "ConnectionNotFoundError" }
}

export class ConnectionAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`A connection for "${slug}" already exists for this organization`)
    this.name = "ConnectionAlreadyExistsError"
  }
}

// ─── connect (API key) ────────────────────────────────────────────────────────

export async function connectApiKey(
  organizationId: string,
  userId:         string,
  slug:           string,
  apiKey:         string,
  config?:        Record<string, unknown>,
): Promise<Connection> {
  getConnector(slug)  // validate slug

  const existing = await prisma.connection.findFirst({
    where: { organizationId, integrationSlug: slug, status: { not: "disconnected" } },
  })
  if (existing) throw new ConnectionAlreadyExistsError(slug)

  const iv              = generateIv()
  const encryptedApiKey = encryptNullable(apiKey, iv)

  const conn = await prisma.connection.create({
    data: {
      organizationId,
      integrationSlug: slug,
      status:          "active",
      encryptionIv:    iv,
      encryptedApiKey,
      config:          (config ?? {}) as never,
    },
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action:     "create",
      entityType: "Connection",
      entityId:   conn.id,
      meta:       { slug },
    },
  })

  return conn
}

// ─── connectOAuth (after code exchange) ──────────────────────────────────────

export async function connectOAuth(
  organizationId: string,
  userId:         string,
  slug:           string,
  code:           string,
  redirectUri:    string,
  config?:        Record<string, unknown>,
): Promise<Connection> {
  const connector = getConnector(slug)
  if (!connector.exchangeCode) throw new Error(`Connector "${slug}" does not support OAuth`)

  const tokens = await connector.exchangeCode(code, redirectUri)
  const iv     = generateIv()

  const existing = await prisma.connection.findFirst({
    where: { organizationId, integrationSlug: slug, status: { not: "disconnected" } },
  })
  if (existing) throw new ConnectionAlreadyExistsError(slug)

  const conn = await prisma.connection.create({
    data: {
      organizationId,
      integrationSlug:       slug,
      status:                "active",
      encryptionIv:          iv,
      encryptedAccessToken:  encryptNullable(tokens.accessToken,   iv),
      encryptedRefreshToken: encryptNullable(tokens.refreshToken,  iv),
      tokenExpiresAt:        tokens.expiresAt ?? null,
      config:                (config ?? {}) as never,
    },
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action:     "create",
      entityType: "Connection",
      entityId:   conn.id,
      meta:       { slug, oauth: true },
    },
  })

  return conn
}

// ─── disconnect ───────────────────────────────────────────────────────────────

export async function disconnect(
  organizationId: string,
  connectionId:   string,
  userId:         string,
): Promise<void> {
  const conn = await prisma.connection.findFirst({
    where: { id: connectionId, organizationId },
  })
  if (!conn) throw new ConnectionNotFoundError(connectionId)

  await prisma.connection.update({
    where: { id: connectionId },
    data:  {
      status:                "disconnected",
      encryptedApiKey:       null,
      encryptedAccessToken:  null,
      encryptedRefreshToken: null,
    },
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action:     "delete",
      entityType: "Connection",
      entityId:   connectionId,
      meta:       { slug: conn.integrationSlug },
    },
  })
}

// ─── refreshTokens ────────────────────────────────────────────────────────────

export async function refreshTokens(connectionId: string): Promise<void> {
  const conn = await prisma.connection.findUnique({ where: { id: connectionId } })
  if (!conn || !conn.encryptedRefreshToken || !conn.encryptionIv) return

  const connector = getConnector(conn.integrationSlug)
  if (!connector.refreshTokens) return

  const refreshToken = decryptNullable(conn.encryptedRefreshToken, conn.encryptionIv)
  if (!refreshToken) return

  try {
    const tokens = await connector.refreshTokens(refreshToken)

    await prisma.connection.update({
      where: { id: connectionId },
      data:  {
        encryptedAccessToken:  encryptNullable(tokens.accessToken,  conn.encryptionIv),
        encryptedRefreshToken: encryptNullable(tokens.refreshToken, conn.encryptionIv),
        tokenExpiresAt:        tokens.expiresAt ?? null,
        status:                "active",
        errorCount:            0,
        lastErrorAt:           null,
        lastErrorMessage:      null,
      },
    })
  } catch (err) {
    await markError(connectionId, err)
  }
}

// ─── markError ────────────────────────────────────────────────────────────────

export async function markError(connectionId: string, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err)
  await prisma.connection.update({
    where: { id: connectionId },
    data:  {
      errorCount:       { increment: 1 },
      lastErrorAt:      new Date(),
      lastErrorMessage: msg.slice(0, 500),
    },
  })
}

// ─── getDecryptedCredentials ──────────────────────────────────────────────────

export function getDecryptedCredentials(conn: Connection): {
  apiKey?:       string | null
  accessToken?:  string | null
  refreshToken?: string | null
} {
  const iv = conn.encryptionIv
  if (!iv) return {}
  return {
    apiKey:       decryptNullable(conn.encryptedApiKey,       iv),
    accessToken:  decryptNullable(conn.encryptedAccessToken,  iv),
    refreshToken: decryptNullable(conn.encryptedRefreshToken, iv),
  }
}
