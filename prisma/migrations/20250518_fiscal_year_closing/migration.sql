-- Migration: 20250518_fiscal_year_closing
-- Adds year-end closing fields to fiscal_years table.
-- New columns are nullable — all existing rows are unaffected.

ALTER TABLE "fiscal_years"
  ADD COLUMN IF NOT EXISTS "closing_journal_id"              UUID,
  ADD COLUMN IF NOT EXISTS "opening_journal_id"              UUID,
  ADD COLUMN IF NOT EXISTS "closing_hash"                    TEXT,
  ADD COLUMN IF NOT EXISTS "closed_at"                       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closed_by_id"                    UUID,
  ADD COLUMN IF NOT EXISTS "reopened_at"                     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reopened_by_id"                  UUID,
  ADD COLUMN IF NOT EXISTS "closed_balance_sheet_snapshot"   JSONB,
  ADD COLUMN IF NOT EXISTS "closed_income_statement_snapshot" JSONB;

-- FK to journals (soft — no cascades, journals are immutable once posted)
ALTER TABLE "fiscal_years"
  ADD CONSTRAINT "fiscal_years_closing_journal_id_fkey"
    FOREIGN KEY ("closing_journal_id") REFERENCES "journals"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fiscal_years_opening_journal_id_fkey"
    FOREIGN KEY ("opening_journal_id") REFERENCES "journals"("id") ON DELETE SET NULL;

-- FK to users
ALTER TABLE "fiscal_years"
  ADD CONSTRAINT "fiscal_years_closed_by_id_fkey"
    FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fiscal_years_reopened_by_id_fkey"
    FOREIGN KEY ("reopened_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
