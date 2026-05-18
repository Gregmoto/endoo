-- CreateEnum
CREATE TYPE "SieImportStatus" AS ENUM ('pending', 'previewed', 'importing', 'completed', 'failed');

-- AlterEnum: add SIE audit actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'sie_import_preview';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'sie_import_execute';

-- CreateTable
CREATE TABLE "sie_import_jobs" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId"   UUID NOT NULL,
    "fileName"         TEXT NOT NULL,
    "fileSize"         INTEGER NOT NULL,
    "fileHash"         TEXT NOT NULL,
    "charset"          TEXT NOT NULL DEFAULT 'CP437',
    "sieType"          INTEGER,
    "rawContent"       TEXT NOT NULL,
    "status"           "SieImportStatus" NOT NULL DEFAULT 'pending',
    "previewData"      JSONB,
    "importOptions"    JSONB,
    "importResult"     JSONB,
    "errorMessage"     TEXT,
    "importedByUserId" UUID,
    "startedAt"        TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sie_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sie_import_jobs_organizationId_fileHash_key" ON "sie_import_jobs"("organizationId", "fileHash");
CREATE INDEX "sie_import_jobs_organizationId_status_idx" ON "sie_import_jobs"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "sie_import_jobs"
    ADD CONSTRAINT "sie_import_jobs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sie_import_jobs"
    ADD CONSTRAINT "sie_import_jobs_importedByUserId_fkey"
    FOREIGN KEY ("importedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
