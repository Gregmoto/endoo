import { PlanLimitError } from "@/lib/plans/guard"
import { PLAN_LABELS } from "@/lib/plans/limits"

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
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }

  const e = err as { name?: string; message?: string }

  if (e.name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }

  if (e.name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }

  if (err instanceof PlanLimitError) {
    const body =
      err.kind === "feature"
        ? {
            error: "plan_limit",
            kind: "feature",
            feature: err.feature,
            currentPlan: err.currentPlan,
            requiredPlan: err.requiredPlan,
            requiredPlanLabel: PLAN_LABELS[err.requiredPlan],
            message: err.message,
          }
        : {
            error: "plan_limit",
            kind: "limit",
            limit: err.limitKey,
            current: err.current,
            max: err.max,
            currentPlan: err.currentPlan,
            requiredPlan: err.requiredPlan,
            requiredPlanLabel: PLAN_LABELS[err.requiredPlan],
            message: err.message,
          }
    return Response.json(body, { status: 402 })
  }

  console.error(`[${label}]`, err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
