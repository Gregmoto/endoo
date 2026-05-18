-- Migration: 20250518_fixed_assets
-- Creates fixed_assets and depreciation_schedules tables for the
-- anläggningstillgångar (fixed assets) + avskrivning (depreciation) module.

-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "DepreciationMethod" AS ENUM (
  'linear',
  'declining_balance',
  'tax_book'
);

CREATE TYPE "FixedAssetStatus" AS ENUM (
  'active',
  'disposed',
  'written_off'
);

CREATE TYPE "DepreciationScheduleStatus" AS ENUM (
  'planned',
  'posted',
  'reversed'
);

-- ── fixed_assets ────────────────────────────────────────────────────────────

CREATE TABLE "fixed_assets" (
  "id"                              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"                 UUID        NOT NULL,
  "asset_number"                    TEXT        NOT NULL,
  "name"                            TEXT        NOT NULL,
  "description"                     TEXT,
  "category"                        TEXT        NOT NULL,

  "asset_account"                   TEXT        NOT NULL,
  "depreciation_account"            TEXT        NOT NULL,
  "accumulated_depreciation_account" TEXT       NOT NULL,

  "acquisition_date"                DATE        NOT NULL,
  "acquisition_cost"                BIGINT      NOT NULL,
  "residual_value"                  BIGINT      NOT NULL DEFAULT 0,

  "useful_life_months"              INTEGER     NOT NULL,
  "depreciation_method"             "DepreciationMethod" NOT NULL,
  "decline_rate"                    DECIMAL(6,4),

  "status"                          "FixedAssetStatus"   NOT NULL DEFAULT 'active',
  "disposal_date"                   DATE,
  "disposal_proceeds"               BIGINT,
  "disposal_journal_id"             UUID,

  "supplier_invoice_id"             UUID,
  "notes"                           TEXT,

  "created_at"                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- Unique asset number per org
ALTER TABLE "fixed_assets"
  ADD CONSTRAINT "fixed_assets_organization_id_asset_number_key"
    UNIQUE ("organization_id", "asset_number");

-- FK: organization
ALTER TABLE "fixed_assets"
  ADD CONSTRAINT "fixed_assets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- FK: supplier_invoice (optional)
ALTER TABLE "fixed_assets"
  ADD CONSTRAINT "fixed_assets_supplier_invoice_id_fkey"
    FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL;

-- Indexes
CREATE INDEX "fixed_assets_organization_id_status_idx"
  ON "fixed_assets" ("organization_id", "status");

CREATE INDEX "fixed_assets_organization_id_category_idx"
  ON "fixed_assets" ("organization_id", "category");

CREATE INDEX "fixed_assets_organization_id_acquisition_date_idx"
  ON "fixed_assets" ("organization_id", "acquisition_date");

-- ── depreciation_schedules ──────────────────────────────────────────────────

CREATE TABLE "depreciation_schedules" (
  "id"                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"      UUID        NOT NULL,
  "fixed_asset_id"       UUID        NOT NULL,

  "period"               TEXT        NOT NULL,  -- "YYYY-MM"
  "depreciation_amount"  BIGINT      NOT NULL,
  "accumulated_amount"   BIGINT      NOT NULL,
  "book_value"           BIGINT      NOT NULL,

  "journal_id"           UUID,
  "status"               "DepreciationScheduleStatus" NOT NULL DEFAULT 'planned',

  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- Unique period per asset per org
ALTER TABLE "depreciation_schedules"
  ADD CONSTRAINT "depreciation_schedules_organization_id_fixed_asset_id_period_key"
    UNIQUE ("organization_id", "fixed_asset_id", "period");

-- FK: organization
ALTER TABLE "depreciation_schedules"
  ADD CONSTRAINT "depreciation_schedules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- FK: fixed_asset
ALTER TABLE "depreciation_schedules"
  ADD CONSTRAINT "depreciation_schedules_fixed_asset_id_fkey"
    FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "depreciation_schedules_organization_id_period_status_idx"
  ON "depreciation_schedules" ("organization_id", "period", "status");

CREATE INDEX "depreciation_schedules_fixed_asset_id_idx"
  ON "depreciation_schedules" ("fixed_asset_id");

-- ── AuditAction: new values ─────────────────────────────────────────────────
-- asset_create, asset_dispose, asset_write_off, depreciation_post are added
-- via Prisma schema enum update; PostgreSQL ALTER TYPE adds them automatically
-- when Prisma runs prisma db push / migrate deploy.
