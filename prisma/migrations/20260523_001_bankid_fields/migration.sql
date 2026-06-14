-- Migration: 20260523_001_bankid_fields
-- Adds BankID support fields to SignatureRequest and Signer

ALTER TABLE "signature_requests"
  ADD COLUMN IF NOT EXISTS "requireBankId" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "signers"
  ADD COLUMN IF NOT EXISTS "bankIdPersonnummer"  TEXT,
  ADD COLUMN IF NOT EXISTS "bankIdName"          TEXT,
  ADD COLUMN IF NOT EXISTS "bankIdTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "bankIdCertificate"   TEXT,
  ADD COLUMN IF NOT EXISTS "bankIdCompletedAt"   TIMESTAMP(3);
