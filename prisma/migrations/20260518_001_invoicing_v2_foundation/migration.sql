-- Migration: 20260518_001_invoicing_v2_foundation
-- Invoicing v2 foundation: extends Invoice/InvoiceLineItem/Product,
-- adds invoicingSettings to Organization, creates 8 new tables.
-- Fully backward-compatible: no DROP operations, all new columns nullable or with defaults.

-- ─── 1. Organization: add invoicingSettings ───────────────────────────────────
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "invoicingSettings" JSONB;

-- ─── 2. Invoice: new v2 columns ───────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "priceMode"            VARCHAR(20)   NOT NULL DEFAULT 'excl_vat',
  ADD COLUMN IF NOT EXISTS "exchangeRate"         DECIMAL(12,6),
  ADD COLUMN IF NOT EXISTS "exchangeRateDate"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentTermsDays"     INTEGER,
  ADD COLUMN IF NOT EXISTS "ourReference"         TEXT,
  ADD COLUMN IF NOT EXISTS "yourReference"        TEXT,
  ADD COLUMN IF NOT EXISTS "yourOrderNumber"      TEXT,
  ADD COLUMN IF NOT EXISTS "priceListId"          UUID,
  ADD COLUMN IF NOT EXISTS "invoiceLang"          VARCHAR(10)   NOT NULL DEFAULT 'sv',
  ADD COLUMN IF NOT EXISTS "vatType"              VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "deliveryName"         TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryDate"         DATE,
  ADD COLUMN IF NOT EXISTS "deliveryLine1"        TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryLine2"        TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryPostalCode"   TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryCity"         TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryCountry"      TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryMethodId"     UUID,
  ADD COLUMN IF NOT EXISTS "deliveryTermsId"      UUID,
  ADD COLUMN IF NOT EXISTS "freightAmount"        BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invoiceFeeAmount"     BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invoiceDiscountRate"  DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS "netAmount"            BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grossAmount"          BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundingAmount"       BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "freeText"             TEXT,
  ADD COLUMN IF NOT EXISTS "shipmentMark"         TEXT,
  ADD COLUMN IF NOT EXISTS "cashAccount"          TEXT,
  ADD COLUMN IF NOT EXISTS "inventoryUpdated"     BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "inventoryUpdatedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "parentInvoiceId"      UUID,
  ADD COLUMN IF NOT EXISTS "isInterestInvoice"    BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "reminderFeeApplied"   BOOLEAN       NOT NULL DEFAULT FALSE;

-- ─── 3. InvoiceLineItem: new v2 columns ──────────────────────────────────────
ALTER TABLE "invoice_line_items"
  ADD COLUMN IF NOT EXISTS "articleNumber"        TEXT,
  ADD COLUMN IF NOT EXISTS "orderedQuantity"      DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "deliveredQuantity"    DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "warehouseLocation"    TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber"        TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice"        BIGINT,
  ADD COLUMN IF NOT EXISTS "marginPercent"        DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "vatType"              VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "priceIncludesVat"     BOOLEAN       NOT NULL DEFAULT FALSE;

-- ─── 4. Product: new v2 columns ───────────────────────────────────────────────
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "warehouseLocation"    TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice"        BIGINT,
  ADD COLUMN IF NOT EXISTS "purchaseAccount"      TEXT,
  ADD COLUMN IF NOT EXISTS "salesAccount"         TEXT,
  ADD COLUMN IF NOT EXISTS "vatType"              VARCHAR(30);

-- ─── 5. New tables ───────────────────────────────────────────────────────────

CREATE TABLE "payment_terms" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "code"           TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,
  "days"           INTEGER     NOT NULL,
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_terms_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX "payment_terms_organizationId_idx" ON "payment_terms"("organizationId");

CREATE TABLE "units" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "code"           TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "units_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX "units_organizationId_idx" ON "units"("organizationId");

CREATE TABLE "org_currencies" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "code"           TEXT        NOT NULL,
  "symbol"         TEXT,
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_currencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_currencies_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX "org_currencies_organizationId_idx" ON "org_currencies"("organizationId");

CREATE TABLE "delivery_methods" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "code"           TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_methods_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX "delivery_methods_organizationId_idx" ON "delivery_methods"("organizationId");

CREATE TABLE "delivery_terms" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "code"           TEXT        NOT NULL,
  "name"           TEXT        NOT NULL,
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_terms_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX "delivery_terms_organizationId_idx" ON "delivery_terms"("organizationId");

CREATE TABLE "price_lists" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID        NOT NULL,
  "name"           TEXT        NOT NULL,
  "currency"       TEXT        NOT NULL DEFAULT 'SEK',
  "priceMode"      TEXT        NOT NULL DEFAULT 'excl_vat',
  "isActive"       BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_lists_organizationId_idx" ON "price_lists"("organizationId");

CREATE TABLE "price_list_items" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "priceListId" UUID        NOT NULL,
  "productId"   UUID        NOT NULL,
  "price"       BIGINT      NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_list_items_priceListId_productId_key" UNIQUE ("priceListId", "productId")
);
CREATE INDEX "price_list_items_priceListId_idx" ON "price_list_items"("priceListId");

CREATE TABLE "invoice_templates" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId"  UUID        NOT NULL,
  "name"            TEXT        NOT NULL,
  "language"        TEXT        NOT NULL DEFAULT 'sv',
  "showLogo"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "showSwishQr"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "footerText"      TEXT,
  "postalAddress"   TEXT,
  "streetAddress"   TEXT,
  "phone"           TEXT,
  "bankgiro"        TEXT,
  "plusgiro"        TEXT,
  "iban"            TEXT,
  "bic"             TEXT,
  "vatNumber"       TEXT,
  "fScattCertified" BOOLEAN     NOT NULL DEFAULT TRUE,
  "isDefault"       BOOLEAN     NOT NULL DEFAULT FALSE,
  "isActive"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "invoice_templates_organizationId_idx" ON "invoice_templates"("organizationId");

CREATE TABLE "exchange_rates" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "fromCurrency"   TEXT        NOT NULL,
  "toCurrency"     TEXT        NOT NULL,
  "rate"           DECIMAL(12,6) NOT NULL,
  "rateDate"       DATE        NOT NULL,
  "source"         TEXT        NOT NULL,
  "fetchedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exchange_rates_from_to_date_source_key"
    UNIQUE ("fromCurrency", "toCurrency", "rateDate", "source")
);
CREATE INDEX "exchange_rates_rateDate_idx" ON "exchange_rates"("rateDate");
CREATE INDEX "exchange_rates_from_to_idx" ON "exchange_rates"("fromCurrency", "toCurrency");

-- ─── 6. Foreign keys on Invoice ───────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_priceListId_fkey"
    FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoices_deliveryMethodId_fkey"
    FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoices_deliveryTermsId_fkey"
    FOREIGN KEY ("deliveryTermsId") REFERENCES "delivery_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoices_parentInvoiceId_fkey"
    FOREIGN KEY ("parentInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 7. Foreign keys on new tables ───────────────────────────────────────────
ALTER TABLE "payment_terms"
  ADD CONSTRAINT "payment_terms_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "units"
  ADD CONSTRAINT "units_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_currencies"
  ADD CONSTRAINT "org_currencies_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_methods"
  ADD CONSTRAINT "delivery_methods_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_terms"
  ADD CONSTRAINT "delivery_terms_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_lists"
  ADD CONSTRAINT "price_lists_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_items"
  ADD CONSTRAINT "price_list_items_priceListId_fkey"
    FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "price_list_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_templates"
  ADD CONSTRAINT "invoice_templates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exchange_rates"
  ADD CONSTRAINT "exchange_rates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
