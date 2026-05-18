import { PlanLimitError } from "@/lib/plans/guard"
import { PLAN_LABELS }    from "@/lib/plans/limits"
import { apiError }       from "@/lib/api/response"

/**
 * Central API error handler.
 * Import and call at the bottom of every route handler's catch block.
 *
 * Returns the appropriate Response for known error types:
 *   401 — UnauthenticatedError
 *   402 — PlanLimitError (plan gate)
 *   403 — UnauthorizedError (RBAC)
 *   400 — ZodError (validation)
 *   500 — everything else
 */
export function handleApiError(err: unknown, label = "api"): Response {
  if (!err || typeof err !== "object") {
    console.error(`[${label}]`, err)
    return apiError("internal_error", "Internt fel")
  }

  const e = err as { name?: string; message?: string }

  if (e.name === "UnauthenticatedError") {
    return apiError("unauthorized", "Ej inloggad")
  }

  if (e.name === "UnauthorizedError") {
    return apiError("forbidden", "Otillräckliga rättigheter")
  }

  if (err instanceof PlanLimitError) {
    const details =
      err.kind === "feature"
        ? {
            kind:              "feature",
            feature:           err.feature,
            currentPlan:       err.currentPlan,
            requiredPlan:      err.requiredPlan,
            requiredPlanLabel: PLAN_LABELS[err.requiredPlan],
          }
        : {
            kind:         "limit",
            limit:        err.limitKey,
            current:      err.current,
            max:          err.max,
            currentPlan:  err.currentPlan,
            requiredPlan: err.requiredPlan,
            requiredPlanLabel: PLAN_LABELS[err.requiredPlan],
          }
    return apiError("payment_required", err.message, 402, { error: "plan_limit", ...details })
  }

  console.error(`[${label}]`, err)
  return apiError("internal_error", "Internt fel")
}
