-- Migration: 20250519_sru_export
-- Adds SRU export table for K2/K3 annual reports and INK2 tax declarations

-- Enums
CREATE TYPE "SruExportType" AS ENUM ('k2', 'k3', 'ink2');
CREATE TYPE "SruExportStatus" AS ENUM ('draft', 'final');

-- SruExport table
CREATE TABLE "sru_exports" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId"      UUID NOT NULL,
    "fiscalYearId"        UUID NOT NULL,
    "type"                "SruExportType" NOT NULL,
    "status"              "SruExportStatus" NOT NULL DEFAULT 'draft',
    "infoSru"             TEXT NOT NULL,
    "blankettSru"         TEXT NOT NULL,
    "generatedByUserId"   UUID,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sru_exports_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "sru_exports_organizationId_fiscalYearId_idx" ON "sru_exports"("organizationId", "fiscalYearId");
CREATE INDEX "sru_exports_organizationId_status_idx" ON "sru_exports"("organizationId", "status");

-- Foreign keys
ALTER TABLE "sru_exports" ADD CONSTRAINT "sru_exports_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sru_exports" ADD CONSTRAINT "sru_exports_fiscalYearId_fkey"
    FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sru_exports" ADD CONSTRAINT "sru_exports_generatedByUserId_fkey"
    FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AuditAction enum value
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'sru_export_generate';
