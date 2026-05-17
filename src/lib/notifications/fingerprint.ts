import { createHash } from "crypto"
import type { DeduplicationWindow } from "./types"

export function computeEventFingerprint(input: {
  organizationId: string
  type:           string
  entityId:       string
  window:         DeduplicationWindow
}): string {
  const windowKey = resolveWindowKey(input.window)
  const raw = `${input.organizationId}:${input.type}:${input.entityId}:${windowKey}`
  return createHash("sha256").update(raw).digest("hex")
}

function resolveWindowKey(window: DeduplicationWindow): string {
  switch (window.kind) {
    case "exact":
      return window.key
    case "daily": {
      const d = window.date ?? new Date()
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    }
    case "hourly": {
      const d = window.date ?? new Date()
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
    }
    case "threshold":
      return window.value
  }
}
