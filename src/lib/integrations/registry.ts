/**
 * Connector registry — all available integrations indexed by slug.
 *
 * Import connectors lazily so unused modules don't bloat the bundle.
 */

import type { Connector } from "./types"

// Eagerly imported connectors (lightweight)
import { stripeConnector }         from "./connectors/stripe"
import { fortnoxImportConnector }  from "./connectors/fortnox-import"

export const CONNECTORS: Record<string, Connector> = {
  stripe:         stripeConnector,
  fortnox_import: fortnoxImportConnector,
}

export function getConnector(slug: string): Connector {
  const c = CONNECTORS[slug]
  if (!c) throw new ConnectorNotFoundError(slug)
  return c
}

export function listConnectors() {
  return Object.values(CONNECTORS).map((c) => ({
    slug:         c.config.slug,
    displayName:  c.config.displayName,
    authStrategy: c.config.authStrategy,
    capabilities: c.config.capabilities,
  }))
}

export class ConnectorNotFoundError extends Error {
  constructor(slug: string) {
    super(`No connector registered for slug: ${slug}`)
    this.name = "ConnectorNotFoundError"
  }
}
