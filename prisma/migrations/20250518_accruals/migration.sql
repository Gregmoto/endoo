-- Migration: 20250518_accruals
-- Creates accruals and accrual_periods tables for the periodiseringsmodul.

-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "AccrualType" AS ENUM (
  'prepaid_expense',
  'accrued_expense',
  'prepaid_revenue',
  'accrued_revenue'
);

CREATE TYPE "AccrualStatus" AS ENUM (
  'active',
  'completed',
  'reversed'
);

CREATE TYPE "AccrualPeriodStatus" AS ENUM (
  'planned',
  'posted'
);

-- ── accruals ────────────────────────────────────────────────────────────────

CREATE TABLE "accruals" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID         NOT NULL,

  "accrual_number"   TEXT         NOT NULL,
  "type"             "AccrualType" NOT NULL,
  "description"      TEXT         NOT NULL,

  "total_amount"     BIGINT       NOT NULL,
  "start_date"       DATE         NOT NULL,
  "end_date"         DATE         NOT NULL,
  "period_count"     INTEGER      NOT NULL,

  "main_account"     TEXT         NOT NULL,
  "accrual_account"  TEXT         NOT NULL,

  "source_type"      TEXT,
  "source_id"        UUID,

  "status"           "AccrualStatus" NOT NULL DEFAULT 'active',
  "notes"            TEXT,

  "created_by_user_id" UUID,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accruals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "accruals"
  ADD CONSTRAINT "accruals_organization_id_accrual_number_key"
    UNIQUE ("organization_id", "accrual_number");

ALTER TABLE "accruals"
  ADD CONSTRAINT "accruals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

CREATE INDEX "accruals_organization_id_status_idx"
  ON "accruals" ("organization_id", "status");

CREATE INDEX "accruals_organization_id_type_idx"
  ON "accruals" ("organization_id", "type");

CREATE INDEX "accruals_organization_id_start_date_idx"
  ON "accruals" ("organization_id", "start_date");

-- ── accrual_periods ─────────────────────────────────────────────────────────

CREATE TABLE "accrual_periods" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID         NOT NULL,
  "accrual_id"       UUID         NOT NULL,

  "period"           TEXT         NOT NULL,
  "amount"           BIGINT       NOT NULL,
  "journal_id"       UUID,
  "status"           "AccrualPeriodStatus" NOT NULL DEFAULT 'planned',

  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accrual_periods_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "accrual_periods"
  ADD CONSTRAINT "accrual_periods_organization_id_accrual_id_period_key"
    UNIQUE ("organization_id", "accrual_id", "period");

ALTER TABLE "accrual_periods"
  ADD CONSTRAINT "accrual_periods_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "accrual_periods"
  ADD CONSTRAINT "accrual_periods_accrual_id_fkey"
    FOREIGN KEY ("accrual_id") REFERENCES "accruals"("id") ON DELETE CASCADE;

CREATE INDEX "accrual_periods_organization_id_period_status_idx"
  ON "accrual_periods" ("organization_id", "period", "status");

CREATE INDEX "accrual_periods_accrual_id_idx"
  ON "accrual_periods" ("accrual_id");
