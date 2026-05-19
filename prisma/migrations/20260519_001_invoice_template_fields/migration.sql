-- Add missing fields to invoice_templates for full PDF footer/Swish support
ALTER TABLE "invoice_templates"
  ADD COLUMN IF NOT EXISTS "swishNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl"     TEXT,
  ADD COLUMN IF NOT EXISTS "email"       TEXT,
  ADD COLUMN IF NOT EXISTS "website"     TEXT,
  ADD COLUMN IF NOT EXISTS "boardSeat"   TEXT,
  ADD COLUMN IF NOT EXISTS "fax"         TEXT;
