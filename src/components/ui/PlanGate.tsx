"use client"

/**
 * Wraps a feature that requires a specific plan.
 * Shows the children if the org has access, otherwise renders UpgradePrompt.
 *
 * Usage:
 *   <PlanGate feature="ai_assistant" currentPlan={orgPlan}>
 *     <AiChat />
 *   </PlanGate>
 */

import { type ReactNode } from "react"
import { UpgradePrompt }  from "./UpgradePrompt"
import type { Plan }      from "@prisma/client"
import { PLAN_LIMITS, type PlanFeature } from "@/lib/plans/limits"

interface Props {
  feature:     PlanFeature
  currentPlan: Plan
  children:    ReactNode
  /** Optional custom locked state (e.g. dimmed card instead of full prompt) */
  fallback?:   ReactNode
}

export function PlanGate({ feature, currentPlan, children, fallback }: Props) {
  const hasAccess = PLAN_LIMITS[currentPlan].features.includes(feature)
  if (hasAccess) return <>{children}</>
  if (fallback !== undefined) return <>{fallback}</>
  return <UpgradePrompt feature={feature} currentPlan={currentPlan} />
}
