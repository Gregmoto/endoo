/**
 * Accounting service — thin facade over lib/accounting/
 *
 * All business logic lives in lib/accounting/. This service layer:
 *   - provides a single import point for API routes
 *   - adds cross-cutting concerns (audit, event emission) in one place
 *   - keeps API routes free of accounting business logic
 *
 * Future: migrate lib/accounting/* logic here directly.
 */

export * from "@/lib/accounting/accounts"
export * from "@/lib/accounting/journals"
export * from "@/lib/accounting/bas-seed"
