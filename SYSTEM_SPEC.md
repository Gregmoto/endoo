# Endoo — Komplett systemspecifikation

> Genererad: 2026-05-17  
> Version: baserad på kodbasen per senaste commit

---

## Innehållsförteckning

1. [Plattform och arkitektur](#1-plattform-och-arkitektur)
2. [Dashboard och navigation](#2-dashboard-och-navigation)
3. [Fakturering](#3-fakturering)
4. [Kunder och kontakter](#4-kunder-och-kontakter)
5. [Produkter och tjänster](#5-produkter-och-tjänster)
6. [Bokföring](#6-bokföring)
7. [Leverantörsfakturor](#7-leverantörsfakturor)
8. [Rapporter](#8-rapporter)
9. [Lager](#9-lager)
10. [AI-assistent](#10-ai-assistent)
11. [API-plattform](#11-api-plattform)
12. [Byråfunktioner](#12-byråfunktioner)
13. [Kundportal](#13-kundportal)
14. [Offerter och avtal](#14-offerter-och-avtal)
15. [Inställningar](#15-inställningar)
16. [Säkerhet](#16-säkerhet)
17. [Infrastruktur och teknik](#17-infrastruktur-och-teknik)
18. [Datamodell](#18-datamodell)
19. [API-routes](#19-api-routes)
20. [Saknade funktioner och rekommendationer](#20-saknade-funktioner-och-rekommendationer)

---

## Statusförklaring

| Symbol | Betydelse |
|--------|-----------|
| ✅ | Färdig — implementerad och byggbar |
| 🚧 | Pågående — kod finns men inte komplett |
| 🧠 | Planerad — finns i schema/routes men ingen UI |
| ❌ | Saknas — identifierad men ej påbörjad |

---

## 1. Plattform och arkitektur

### Auth-system

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Provider** | NextAuth.js v5 (Auth.js) |
| **Session** | JWT + DB-session (`Session`-modell) |
| **Strategi** | JWT-baserad med `activeOrganizationId` och `impersonatingOrganizationId` i token |
| **Viktiga filer** | `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| **Routes** | `POST /api/auth/callback/credentials`, `GET /api/auth/session` |
| **Säkerhet** | `NEXTAUTH_SECRET` krävs i env |

**Funktioner:**
- Email/lösenord-inloggning
- Session-baserad multi-org-switcher (`activeOrganizationId` i JWT)
- Impersonation (`impersonatingOrganizationId` i JWT)
- `isPlatformAdmin`-flagga för super admin bypass

---

### Multi-tenant

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Strategi** | Shared database, row-level tenant isolation |
| **Tenant-nyckel** | `organizationId` på alla tenant-scoped modeller |
| **URL-struktur** | `/[orgSlug]/...` för alla dashboard-routes |
| **Viktiga filer** | `src/app/(dashboard)/[orgSlug]/layout.tsx`, `src/middleware.ts` |

**Isolering:**
- Varje Prisma-query filtrerar på `{ organizationId: org.id }`
- Middleware validerar att inloggad användare är medlem i den begärda orgen
- Agency-impersonation hanteras separat med `impersonatingOrganizationId`

---

### RBAC (Role-Based Access Control)

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Viktiga filer** | `src/lib/rbac/permissions.ts`, `src/lib/rbac/roles.ts` |

**9 systemroller:**

| Roll | Org-typ | Org-roll | Beskrivning |
|------|---------|----------|-------------|
| `super_admin` | — | `isPlatformAdmin=true` | Full plattforms-access, kan impersonera alla orgar |
| `agency_owner` | agency | owner | Äger byrå-kontot, all access |
| `agency_admin` | agency | admin | Admin utan att kunna ta bort orgen |
| `agency_staff` | agency | member | Kan arbeta med klienters data |
| `agency_viewer` | agency | viewer | Läsaccess till byrå |
| `customer_owner` | customer | owner | Äger kundkontot |
| `customer_admin` | customer | admin | Admin-access för kund |
| `customer_user` | customer | member | Vanlig användare |
| `customer_viewer` | customer | viewer | Läsaccess |

**17 permission-grupper (164+ individuella permissions):**
- `platform:*` — super_admin only
- `invoices:read/create/update/delete/send/void/export`
- `contacts:read/create/update/delete`
- `products:read/create/update/delete`
- `payments:read/create/delete`
- `contracts:read/create/update/delete`
- `users:read/invite/update/remove`
- `settings:read/update`
- `reports:read/export`
- `accounting:read/create/update/post/void/lock`
- `supplier_invoices:read/create/update/delete/extract/book/pay/approve`
- `inventory:read/create/update/delete`
- `agency:read_clients/manage_clients/impersonate`
- `tasks:read/create/update/delete`
- `signatures:read/create/send/cancel`
- `quotes:read/create/update/delete/send/convert`
- `branding:read/update`

---

### Organization switching

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Viktiga filer** | `src/app/api/auth/switch-org/route.ts`, `src/app/api/auth/orgs/route.ts` |
| **UI** | Org-switcher i sidebar med dropdown |

Användare kan tillhöra flera organisationer. Dropdown i sidebar listar alla orgar användaren är medlem i. Vid switch uppdateras `activeOrganizationId` i JWT-sessionen.

---

### Agency mode & Impersonation

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Viktiga filer** | `src/app/api/auth/impersonate/route.ts`, `src/app/api/auth/exit-impersonation/route.ts`, `src/components/layout/ImpersonationBanner.tsx` |
| **Routes** | `POST /api/auth/impersonate`, `POST /api/auth/exit-impersonation` |

Byråanvändare kan agera som ett kundkonto. En orange `ImpersonationBanner` visas längst upp med info om vilken byrå som agerar och länk för att avsluta. Permission `agency:impersonate` krävs.

---

### Subscriptions & Stripe

| Egenskap | Detalj |
|----------|--------|
| **Status** | 🚧 Pågående |
| **Viktiga filer** | `src/lib/stripe.ts`, `src/app/api/stripe/`, `src/app/api/webhooks/stripe/route.ts` |
| **Routes** | `POST /api/stripe/checkout`, `POST /api/stripe/portal`, `POST /api/webhooks/stripe` |

**Plan-enum:** `free`, `starter`, `pro`, `enterprise`

Organisation har `stripeCustomerId` och `stripeSubscriptionId`. Stripe-checkout för uppgradering, Stripe Customer Portal för hantering. Webhook hanterar betalningshändelser.

**Saknas:** Plan-gating av funktioner (limiter per plan är ej implementerade i koden).

---

### API-plattform

| Egenskap | Detalj |
|----------|--------|
| **Status** | 🚧 Pågående |
| **Viktiga filer** | `src/app/api/api-keys/`, `src/app/api/v1/` |
| **Routes** | `GET/POST /api/api-keys`, `DELETE /api/api-keys/[id]` |
| **Externa routes** | `/api/v1/invoices`, `/api/v1/contacts`, `/api/v1/products`, `/api/v1/journals`, `/api/v1/inventory` |

API-nycklar med `keyHash` (SHA-256), scopes (string array), `live`/`test` miljöer, rate-limit per nyckel. Idempotency-nycklar för skrivoperationer.

**Saknas:** OpenAPI-spec, SDK, webhook-delivery UI, rate-limit enforcement i middleware.

---

### Audit logs

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Modell** | `AuditLog` |
| **Route** | `GET /[orgSlug]/audit` |
| **40+ händelsetyper** | create, update, delete, login, impersonate_start/end, invoice_send/void, payment_record, period_lock/unlock, fiscal_year_lock, m.fl. |

---

### Notifikationer

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Modeller** | `NotificationEvent`, `Notification`, `NotificationJob`, `ActivityFeedItem`, `NotificationPreference` |
| **Routes** | `GET /api/notifications`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all` |
| **UI** | `NotificationBell` i sidebar — badge med antal olästa |

In-app inbox + email-levererans via `NotificationJob`-kö. 50+ event-typer. Per-användare, per-kategori opt-out via `NotificationPreference`.

---

### Dark mode

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Viktiga filer** | `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeToggle.tsx`, `src/app/globals.css` |
| **Bibliotek** | `next-themes` |

`attribute="class"`, `defaultTheme="system"`, `enableSystem`. Tailwind v4 `@variant dark` direktiv. ThemeToggle (sol/måne) i sidebar-botten bredvid användarens e-post.

---

### Cookie consent

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Viktiga filer** | `src/components/ui/CookieBanner.tsx` |
| **Lagring** | `localStorage` under nyckeln `endoo_cookie_consent` |

Tre kategorier: Nödvändiga (alltid på), Analys, Marknadsföring. Kompaktvy med Acceptera/Neka, utbyggbar till per-kategori-toggles. `openCookieSettings()` export för footer-länk.

---

### Storage

| Egenskap | Detalj |
|----------|--------|
| **Status** | 🚧 Pågående |
| **Provider** | Vercel Blob |
| **Användning** | Leverantörsfaktura-filer (`fileKey`), branding-logotyper |

---

### AI-system

Se [sektion 10](#10-ai-assistent).

---

### Integrationer

| Egenskap | Detalj |
|----------|--------|
| **Status** | 🚧 Pågående |
| **Modeller** | `Connection`, `WebhookEvent`, `SyncJob`, `IntegrationLog`, `ExternalEntityMap`, `ImportFile` |
| **Routes** | `/api/integrations/[slug]/connect`, `/api/integrations/[slug]/callback`, `/api/integrations/connections/[id]/sync` |

Planerade integrationer: Shopify, Stripe (payments), Klarna, Fortnox (import). Krypterade credentials (AES-256-GCM). Webhook-verifiering med HMAC. Dedup via `ExternalEntityMap`.

---

## 2. Dashboard och navigation

### Sidebar-navigation

**Byrå-sektion** (visas bara för agency-type):
| Label | Route | Status |
|-------|-------|--------|
| Kundkonton | `/[orgSlug]/clients` | ✅ |
| Varningar | `/[orgSlug]/alerts` | ✅ |

**Fakturering:**
| Label | Route | Status |
|-------|-------|--------|
| Översikt | `/[orgSlug]` | ✅ |
| Fakturor | `/[orgSlug]/invoices` | ✅ |
| Offerter | `/[orgSlug]/quotes` | ✅ |
| Lev.fakturor | `/[orgSlug]/supplier-invoices` | ✅ |
| Betalningar | `/[orgSlug]/payments` | ✅ |
| Avtal | `/[orgSlug]/contracts` | ✅ |
| Signeringar | `/[orgSlug]/signatures` | ✅ |

**Bokföring:**
| Label | Route | Status |
|-------|-------|--------|
| Verifikat | `/[orgSlug]/journals` | ✅ |
| Kontoplan | `/[orgSlug]/accounts` | ✅ |
| Rapporter | `/[orgSlug]/reports` | ✅ |
| Moms | `/[orgSlug]/tax/vat` | ✅ |
| Analys | `/[orgSlug]/analytics` | ✅ |

**Register:**
| Label | Route | Status |
|-------|-------|--------|
| Kunder | `/[orgSlug]/contacts` | ✅ |
| Produkter | `/[orgSlug]/products` | ✅ |
| Lager | `/[orgSlug]/inventory` | ✅ |

**Botten:**
| Label | Route | Status |
|-------|-------|--------|
| Uppgifter | `/[orgSlug]/tasks` | ✅ |
| Team | `/[orgSlug]/team` | ✅ |
| Inställningar | `/[orgSlug]/settings` | ✅ |
| Audit log | `/[orgSlug]/audit` | ✅ |

---

### Dashboard-sidor (alla)

| Sida | Route | Vem ser | Status |
|------|-------|---------|--------|
| Översikt/hem | `/[orgSlug]` | Alla | ✅ |
| Fakturalista | `/[orgSlug]/invoices` | invoices:read | ✅ |
| Ny faktura | `/[orgSlug]/invoices/new` | invoices:create | ✅ |
| Fakturadetail | `/[orgSlug]/invoices/[id]` | invoices:read | ✅ |
| Offerter | `/[orgSlug]/quotes` | quotes:read | ✅ |
| Ny offert | `/[orgSlug]/quotes/new` | quotes:create | ✅ |
| Offertdetail | `/[orgSlug]/quotes/[id]` | quotes:read | ✅ |
| Lev.fakturor | `/[orgSlug]/supplier-invoices` | supplier_invoices:read | ✅ |
| Ladda upp lev.faktura | `/[orgSlug]/supplier-invoices/upload` | supplier_invoices:create | ✅ |
| Lev.fakturadetail | `/[orgSlug]/supplier-invoices/[id]` | supplier_invoices:read | ✅ |
| Betalningar | `/[orgSlug]/payments` | payments:read | ✅ |
| Avtal | `/[orgSlug]/contracts` | contracts:read | ✅ |
| Nytt avtal | `/[orgSlug]/contracts/new` | contracts:create | ✅ |
| Avtaldetail | `/[orgSlug]/contracts/[id]` | contracts:read | ✅ |
| Signeringar | `/[orgSlug]/signatures` | signatures:read | ✅ |
| Verifikat | `/[orgSlug]/journals` | accounting:read | ✅ |
| Verifikatdetail | `/[orgSlug]/journals/[id]` | accounting:read | ✅ |
| Kontoplan | `/[orgSlug]/accounts` | accounting:read | ✅ |
| Rapporter | `/[orgSlug]/reports` | reports:read | ✅ |
| Balansrapport | `/[orgSlug]/reports/balance-sheet` | reports:read | ✅ |
| Resultatrapport | `/[orgSlug]/reports/income-statement` | reports:read | ✅ |
| Huvudbok | `/[orgSlug]/reports/general-ledger` | reports:read | ✅ |
| Råbalans | `/[orgSlug]/reports/trial-balance` | reports:read | ✅ |
| Momsrapport | `/[orgSlug]/reports/vat` | reports:read | ✅ |
| Moms/VAT | `/[orgSlug]/tax/vat` | accounting:read | ✅ |
| Analys | `/[orgSlug]/analytics` | reports:read | ✅ |
| Kunder | `/[orgSlug]/contacts` | contacts:read | ✅ |
| Ny kund | `/[orgSlug]/contacts/new` | contacts:create | ✅ |
| Kunddetail | `/[orgSlug]/contacts/[id]` | contacts:read | ✅ |
| Produkter | `/[orgSlug]/products` | products:read | ✅ |
| Ny produkt | `/[orgSlug]/products/new` | products:create | ✅ |
| Produktdetail | `/[orgSlug]/products/[id]` | products:read | ✅ |
| Lager | `/[orgSlug]/inventory` | inventory:read | ✅ |
| Lagerdetail | `/[orgSlug]/inventory/[id]` | inventory:read | ✅ |
| Uppgifter | `/[orgSlug]/tasks` | tasks:read | ✅ |
| Team | `/[orgSlug]/team` | users:read | ✅ |
| Audit log | `/[orgSlug]/audit` | — | ✅ |
| Klientlista (byrå) | `/[orgSlug]/clients` | agency:read_clients | ✅ |
| Varningar (byrå) | `/[orgSlug]/alerts` | agency:read_clients | ✅ |
| Inställningar | `/[orgSlug]/settings` | settings:read | ✅ |

### Platform admin-sidor

| Sida | Route | Status |
|------|-------|--------|
| Organisationer | `/platform/organizations` | ✅ |
| Org-detail | `/platform/organizations/[id]` | ✅ |
| Användare | `/platform/users` | ✅ |
| Audit | `/platform/audit` | ✅ |

### Mobil navigation
- **Mobile top bar** — hamburger-meny + org-namn + NotificationBell (dold på desktop)
- **Mobile drawer** — slide-in från vänster med samma innehåll som sidebar
- **MobileNavBar** — bottom tab bar med snabblänkar (dold på desktop)

---

## 3. Fakturering

### Faktura-modell

**`Invoice`-modellen:**

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | UUID | Primärnyckel |
| `organizationId` | UUID | Tenant-nyckel |
| `contactId` | UUID? | Kund (nullable för draft) |
| `invoiceNumber` | string | Unikt per org (t.ex. "FV-2026-0001") |
| `status` | enum | draft, sent, viewed, partial, paid, overdue, void, uncollectable |
| `type` | enum | invoice, credit_note, quote, proforma |
| `currency` | string | ISO 4217 (default "SEK") |
| `issueDate` | date | Fakturadatum |
| `dueDate` | date | Förfallodatum |
| `sentAt` | datetime? | När fakturan skickades |
| `viewedAt` | datetime? | När kunden öppnade länken |
| `paidAt` | datetime? | När fullt betalad |
| `voidedAt` | datetime? | När makulerad |
| `lastReminderAt` | datetime? | Senaste påminnelse |
| `reminderCount` | int | Antal skickade påminnelser |
| `subtotalAmount` | BigInt | Summa ex moms (öre) |
| `taxAmount` | BigInt | Momsbelopp (öre) |
| `discountAmount` | BigInt | Rabatt (öre) |
| `totalAmount` | BigInt | Att betala (öre) |
| `paidAmount` | BigInt | Registrerade betalningar (öre) |
| `billingName` | string? | Snapshot av kundnamn vid utskick |
| `billingEmail` | string? | Snapshot av kund-e-post vid utskick |
| `billingAddress` | JSON? | Snapshot av fakturaadress vid utskick |
| `notes` | string? | Meddelande till kund |
| `footerText` | string? | Sidfot på faktura |
| `poNumber` | string? | Kundens beställningsnummer |
| `reference` | string? | Er referens |
| `creditedInvoiceId` | UUID? | Länk till original (för kreditnota) |
| `recurringScheduleId` | UUID? | Länk till avtal |
| `pdfUrl` | string? | Cached PDF URL |
| `journalSentId` | UUID? | Idempotency för bokföring |

**Funktioner:**

| Funktion | Status | Route | Beskrivning |
|---------|--------|-------|-------------|
| Fakturalista | ✅ | `GET /api/invoices` | Filter: status, kontakt, datumspan, sök |
| Skapa faktura | ✅ | `POST /api/invoices` | Med rader, produktval, moms, rabatt |
| Uppdatera faktura | ✅ | `PUT /api/invoices/[id]` | Endast draft-status |
| Ta bort faktura | ✅ | `DELETE /api/invoices/[id]` | Endast draft |
| Skicka faktura | ✅ | `POST /api/invoices/[id]/send` | Genererar PDF, skickar e-post |
| Makulera faktura | ✅ | `POST /api/invoices/[id]/void` | Skapar reversal-journal |
| PDF-generering | ✅ | `GET /api/invoices/[id]/pdf` | React PDF (pdfmake-liknande) |
| Registrera betalning | ✅ | `POST /api/invoices/[id]/payments` | Uppdaterar `paidAmount` |
| Ta bort betalning | ✅ | `DELETE /api/invoices/[id]/payments/[paymentId]` | |
| Kreditnota | ✅ | `POST /api/invoices/[id]/credit-note` | Skapar ny faktura med type=credit_note |
| Konvertera proforma | ✅ | `POST /api/invoices/[id]/convert-proforma` | Proforma → riktig faktura |
| Påminnelser | ✅ | Cron `/api/cron/reminders` | Automatisk e-post för förfallna |
| Recurring invoices | ✅ | Cron `/api/cron/contracts` | Skapar fakturor från `RecurringSchedule` |
| Automatisk bokföring | ✅ | Vid `invoice_send`/`payment_record` | Skapar `Journal` + `JournalEntry` |

### Fakturarad — `InvoiceLineItem`

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `invoiceId` | UUID | FK till Invoice |
| `productId` | UUID? | Valfri produkt-koppling |
| `sortOrder` | int | Radnummer |
| `description` | string | Fritext-beskrivning |
| `quantity` | Decimal 12.4 | Antal |
| `unit` | string | Enhet (st, h, m, etc.) |
| `unitPrice` | BigInt | Styckpris (öre) |
| `taxRate` | Decimal 5.4 | Momssats (t.ex. 0.25) |
| `discountRate` | Decimal | Radrabatt |
| `lineTotal` | BigInt | Radsumma ex moms |
| `taxAmount` | BigInt | Momsen på raden |

### Betalning — `Payment`

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `invoiceId` | UUID | FK till Invoice |
| `amount` | BigInt | Betalat belopp (öre) |
| `currency` | string | Valuta |
| `paymentDate` | date | Betalningsdatum |
| `method` | enum | bank_transfer, card, swish, cash, credit_note, other |
| `reference` | string? | Referens/OCR |
| `notes` | string? | Anteckningar |
| `stripePaymentIntentId` | string? | Stripe-integration |
| `journalId` | UUID? | Bokföringsverifikat |

---

## 4. Kunder och kontakter

### `Contact`-modellen

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | UUID | |
| `organizationId` | UUID | Tenant |
| `type` | string | business / individual |
| `name` | string | Företagsnamn/personnamn |
| `email` | string? | Primär e-post |
| `phone` | string? | Telefon |
| `vatNumber` | string? | Momsregistreringsnummer |
| `orgNumber` | string? | Organisationsnummer |
| `customerNumber` | string? | Kundnummer (auto eller manuellt) |
| `addressLine1` | string? | Fakturaadress rad 1 |
| `addressLine2` | string? | Fakturaadress rad 2 |
| `city` | string? | Stad |
| `postalCode` | string? | Postnummer |
| `country` | string? | Land (ISO 3166-1 alpha-2) |
| `deliveryLine1–deliveryCountry` | string? | Leveransadress (separat) |
| `customerReference` | string? | Er referens hos kunden |
| `internalNotes` | string? | Interna anteckningar |
| `defaultCurrency` | string? | Åsidosätter org-standard |
| `defaultPaymentTermsDays` | int? | Åsidosätter org-standard |
| `defaultTaxRate` | Decimal? | Åsidosätter org-standard |
| `status` | enum | active, inactive, blocked, ended, test |
| `notes` | string? | Fritext-anteckning |
| `tags` | string[] | Taggar |
| `isArchived` | bool | Mjuk arkivering |

### `ContactPerson`-modellen

Kontaktpersoner på ett företag. Fält: `name`, `role`, `email`, `phone`, `isPrimary`, `isInvoiceContact`.

### Funktioner

| Funktion | Status | Route |
|---------|--------|-------|
| Lista kunder | ✅ | `GET /api/contacts` |
| Skapa kund | ✅ | `POST /api/contacts` |
| Uppdatera kund | ✅ | `PUT /api/contacts/[id]` |
| Ta bort kund | ✅ | `DELETE /api/contacts/[id]` |
| Kundhistorik | ✅ | `GET /api/contacts/[id]/history` |
| Kontaktpersoner | ✅ | `GET/POST /api/contacts/[id]/persons` |
| Uppdatera/ta bort person | ✅ | `PUT/DELETE /api/contacts/[id]/persons/[personId]` |
| Sidor | ✅ | `/contacts`, `/contacts/new`, `/contacts/[id]` |

**Saknas:** Import från CSV/Excel, duplikatidentifiering, sammanslagning av kontakter.

---

## 5. Produkter och tjänster

### `Product`-modellen

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `organizationId` | UUID | Tenant |
| `name` | string | Produktnamn |
| `description` | string? | Beskrivning |
| `sku` | string? | Artikelnummer (unikt per org) |
| `type` | enum | product / service |
| `category` | string? | Fritext-kategori |
| `unit` | string | Enhet (@default "piece") |
| `unitPrice` | BigInt | Standardpris (öre) |
| `currency` | string | Valuta |
| `taxRate` | Decimal | Standardmomssats |
| `isActive` | bool | Aktiv/inaktiv |

### `InventoryItem`-modellen (kopplas 1:1 till Product)

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `productId` | UUID | Unique FK |
| `unitOfMeasure` | string | Måttenhet |
| `costMethod` | enum | average / standard |
| `standardCost` | BigInt? | Standardkostnad/enhet |
| `reorderPoint` | Decimal? | Beställningspunkt |

### Funktioner

| Funktion | Status | Route |
|---------|--------|-------|
| Lista produkter | ✅ | `GET /api/products` |
| Skapa produkt | ✅ | `POST /api/products` |
| Uppdatera produkt | ✅ | `PUT /api/products/[id]` |
| Ta bort produkt | ✅ | `DELETE /api/products/[id]` |
| Sidor | ✅ | `/products`, `/products/new`, `/products/[id]` |

**Saknas:** Produktkategorier som separat modell, bulk-import, prislista per kund, flervaluta per produkt.

---

## 6. Bokföring

Endoo har ett komplett dubbel-bokföringssystem med kontoplan, verifikationer, dimensioner, perioder och räkenskapsår.

### Kontoplan — `Account`

| Fält | Beskrivning |
|------|-------------|
| `number` | Kontonummer (unikt per org) |
| `name` | Kontonamn |
| `type` | asset, liability, equity, income, expense |
| `normalSide` | debit / credit |
| `reportClass` | balance_sheet / income_statement |
| `reportSection` | Rubrik i rapport |
| `basNumber` | BAS-standard kontonummer |
| `isSystem` | BAS-konton (lässkyddade) |
| `vatCode` | Momskod |
| `parentNumber` | Hierarki (nivå 1-3) |

### Verifikat — `Journal` + `JournalEntry`

Dubbel-bokföring. Varje verifikat har:
- `JournalSeries`-tillhörighet (A, K, L, etc.)
- Statusmaskin: `draft → posted → voided`
- Immutabilitet: posted-verifikat kan ej ändras, bara makuleras med motverifikat
- `sourceType`/`sourceId` (polymorfisk koppling till faktura/betalning)

Varje rad:
- Antingen `debit` ELLER `credit` > 0 (aldrig båda)
- Valfria dimensioner (kostnadsställe, projekt, etc.)

### Dimensioner

- `DimensionAxis` — dimensionsaxlar (cc = kostnadsställe, project, unit, eller egna)
- `Dimension` — värden per axel (t.ex. "Marknad", "IT", "Projekt A")
- `JournalEntryDimension` — allokering per rad (procent, summa = 100 per axel)
- `AccountDimensionRule` — vilka axlar som är obligatoriska på ett specifikt konto

### Perioder & räkenskapsår

| Modell | Beskrivning |
|--------|-------------|
| `FiscalYear` | Räkenskapsår (open/closed/locked) |
| `AccountingPeriod` | Månadsperiod (open/locked/closed) |
| `AccountingPeriodSnapshot` | Oföränderlig låsningssnapshat (SHA-256) |
| `AccountingPeriodEvent` | Händelselogg för perioden |

### VAT-system — `VatPeriod`

Momsredovisningsperioder (månadsvis/kvartalvis/årsvis). Boxes 05–12, 48, 49. SHA-256 snapshot vid låsning.

| Funktion | Status | Route |
|---------|--------|-------|
| Kontoplan CRUD | ✅ | `/api/accounting/accounts` |
| Dimensionsaxlar | ✅ | `/api/accounting/dimension-axes` |
| Dimensionsvärden | ✅ | `/api/accounting/dimensions` |
| Verifikationslista | ✅ | `/api/journals` |
| Skapa verifikat | ✅ | `POST /api/journals` |
| Void verifikat | ✅ | `POST /api/accounting/journals/[id]/void` |
| Perioder | ✅ | `/api/accounting/periods` |
| Lås/öppna period | ✅ | `POST /api/accounting/periods/[id]/lock` |
| Momsperioder | ✅ | `/api/tax/vat-periods` |
| Beräkna moms | ✅ | `POST /api/tax/vat-periods/[id]/calculate` |
| SIE-export | ✅ | `GET /api/sie/export` |
| Automatkontering | ✅ | Triggas vid faktura-/betalningstransaktioner |

**Saknas:** BAS-kontoplan förimporterad, bokslutsfunktioner (årsavslut), avskrivningsmodul, periodiseringar.

---

## 7. Leverantörsfakturor

Fullständig livscykel: upload → AI-extraktion → granskning → attestering → bokning → betalning.

### `SupplierInvoice`-modellen

| Fält | Beskrivning |
|------|-------------|
| `status` | draft → extracting → needs_review → pending_approval → approved → booked → paid → rejected |
| `fileKey` | Vercel Blob-nyckel för PDF-filen |
| `ocrRawText` | Råtext från OCR |
| `aiExtractedData` | JSON med alla extraherade fält |
| `aiConfidence` | JSON med konfidensnivå per fält |
| `duplicateHash` | SHA-256 för duplikatdetektering |
| `bookingIdempotencyKey` | Unik nyckel för bokföring (förhindrar dubbelbokning) |

### AI-extraktion

Via `/api/supplier-invoices/[id]/extract`. AI läser OCR-text och extraherar: leverantörsnamn, org-nummer, fakturanummer, OCR-nummer, datum, förfall, belopp, momssats, bankgiro/plusgiro/IBAN.

### Attest-workflow

`ApprovalPolicy` → `ApprovalPolicyStep[]` → `ApprovalRequest` → `ApprovalStep[]` → `ApprovalVote[]`

- Policies med beloppsintervall (t.ex. "under 10 000 kr: auto-godkänn")
- Step-typer: `specific_user` eller `role_based`
- Completion rules: `any_one` (räcker med en röst) eller `all_must` (alla måste godkänna)
- Immutable votes — en användare, ett beslut per steg

| Funktion | Status | Route |
|---------|--------|-------|
| Lista lev.fakturor | ✅ | `GET /api/supplier-invoices` |
| Ladda upp | ✅ | `POST /api/supplier-invoices` + Vercel Blob |
| AI-extraktion | ✅ | `POST /api/supplier-invoices/[id]/extract` |
| Granskning | ✅ | Sida `/supplier-invoices/[id]` |
| Attestera | ✅ | `POST /api/supplier-invoices/[id]/approval-requests` |
| Rösta | ✅ | `POST /api/supplier-invoices/[id]/approval-requests/[requestId]/vote` |
| Boka | ✅ | `POST /api/supplier-invoices/[id]/book` |
| Betala | ✅ | `POST /api/supplier-invoices/[id]/pay` |
| Attest-policies | ✅ | `/api/approval-policies` |
| Min attestbox | ✅ | `GET /api/approval-inbox` |

**Saknas:** Bankgiro-betalfil (BGMax), automatisk OCR-leverantörsmatchning, leverantörsportal.

---

## 8. Rapporter

| Rapport | Status | Route | Datakälla |
|---------|--------|-------|-----------|
| Balansrapport | ✅ | `GET /api/reports/balance-sheet` | `JournalEntry` aggregerat per konto |
| Resultatrapport | ✅ | `GET /api/reports/income-statement` | `JournalEntry` aggregerat per konto |
| Råbalans | ✅ | `GET /api/reports/trial-balance` | Debet/kredit per konto |
| Huvudbok | ✅ | `GET /api/reports/general-ledger` | `JournalEntry` per konto med rörelsesumma |
| Momsrapport | ✅ | `GET /api/reports/vat` | `VatPeriod`-boxar |
| Dimensions-P&L | ✅ | `GET /api/accounting/reports/dimension-pnl` | P&L per dimension |
| Projektrapport | ✅ | `GET /api/accounting/reports/project/[id]` | Intäkter/kostnader per projekt |
| SIE-export | ✅ | `GET /api/sie/export` | Hela kontoplanens transaktioner |
| Analytics/KPI | ✅ | `GET /api/analytics/dashboard` | Förberäknade aggregat |
| Realtidsanalys | ✅ | `GET /api/analytics/realtime` | Serverside-aggregat |

**Filters som stöds:** räkenskapsår, period, datumintervall, konto, dimension.

**Saknas:** PDF-export av rapporter, e-postschemalagda rapporter, jämförelseperioder sida vid sida.

---

## 9. Lager

### `InventoryTransaction` — append-only ledger

| Fält | Beskrivning |
|------|-------------|
| `type` | purchase, sale, return_in, return_out, adjustment, count_set |
| `quantity` | Decimal (+/- för in/ut) |
| `unitCost` | Enhetskostnad (öre) |
| `totalCost` | Totalkostnad |
| `sourceType/sourceId` | Polymorf koppling (t.ex. Invoice) |
| `memo` | Anteckning |

Transaktioner skrivs aldrig om — korrigeringar görs som nya rader.

| Funktion | Status | Route |
|---------|--------|-------|
| Lagerlista | ✅ | `GET /api/inventory` |
| Lagerdetail | ✅ | `GET /api/inventory/[id]` |
| Inventering | ✅ | `POST /api/inventory/[id]/count` |
| Transaktionshistorik | ✅ | `GET /api/inventory/[id]/transactions` |
| Extern API | ✅ | `GET /api/v1/inventory` |

**Saknas:** Lagervarningar vid under reorderPoint, inköpsorder-modul, lagervärdesrapport, FIFO-kostnad.

---

## 10. AI-assistent

### `AiShell` — konversations-UI

| Egenskap | Detalj |
|----------|--------|
| **Status** | ✅ Färdig |
| **Komponent** | `src/components/ai/AiShell.tsx` |
| **Route** | `POST /api/ai/chat` |

Inbyggd AI-assistent i dashboard. Kan svara på frågor om bokföring, fakturor, kontakter. Kontextmedveten — skickar org-kontext med varje request.

### AI-funktioner

| Funktion | Status | Route | Beskrivning |
|---------|--------|-------|-------------|
| AI-chat | ✅ | `POST /api/ai/chat` | Fri konversation med ekonomiassistent |
| Förklara | ✅ | `POST /api/ai/explain` | Förklarar en rad/transaktion |
| Kontoförslag | ✅ | `POST /api/ai/suggest-account` | Föreslår bokföringskonto för rad |
| Verifikatförslag | ✅ | `POST /api/ai/suggest-journal` | Föreslår hela verifikatet |
| Kvitto-scan | ✅ | `POST /api/receipts/scan` | OCR + AI-extraktion av kvitto |
| Förslag-hantering | ✅ | `GET/PUT /api/ai/suggestions/[id]` | Acceptera/avvisa/modifiera |
| Avvikelsedetektering | 🚧 | — | `AiAnomaly`-modell finns, UI saknas |

### `AiSuggestion`-modell

| Fält | Beskrivning |
|------|-------------|
| `feature` | receipt_scan, account_suggest, journal_suggest, anomaly_detect, explain |
| `sourceType` | supplier_invoice, journal_entry, receipt, manual |
| `suggestion` | JSON med förslaget |
| `confidence` | Float 0–1 |
| `status` | pending → accepted/modified/rejected/expired |
| `expiresAt` | Auto-utgång efter 7 dagar |
| Telemetri | `modelId`, `promptTokens`, `completionTokens`, `latencyMs` |

### `AiAnomaly`-modell

Typer: `duplicate_invoice`, `amount_outlier`, `wrong_account`, `vat_mismatch`.
Allvarlighetsgrad: `info`, `warning`, `error`.

**Saknas:** Avvikelsedetektering UI, AI-generated bokslut, prediktiva kassaflödesprognoser, automatisk matchning leverantör→faktura.

---

## 11. API-plattform

### Externa API-routes (v1)

| Route | Metod | Auth | Beskrivning |
|-------|-------|------|-------------|
| `/api/v1/invoices` | GET | API-nyckel | Lista fakturor |
| `/api/v1/contacts` | GET | API-nyckel | Lista kontakter |
| `/api/v1/products` | GET | API-nyckel | Lista produkter |
| `/api/v1/journals` | GET | API-nyckel | Lista verifikat |
| `/api/v1/inventory` | GET | API-nyckel | Lagerstatus |

### `ApiKey`-modellen

| Fält | Beskrivning |
|------|-------------|
| `name` | Användarvänlig etikett |
| `keyPrefix` | Första 8 tecken (visas i UI) |
| `keyHash` | SHA-256 av hela nyckeln |
| `scopes` | string[] med tillåtna endpoints |
| `environment` | live / test |
| `rateLimit` | Requests/minut (null = plattformens standard) |
| `lastUsedAt` | Senast använd |
| `expiresAt` | Valfri utgångstid |
| `isActive` | Kan revokeras |

### `IdempotencyKey`-modellen

Förhindrar dubbelskrivning. Nyckel + SHA-256 av request-body. Svar cachas i 24h.

### Webhooks (inkommande)

| Route | Beskrivning |
|-------|-------------|
| `/api/webhooks/[slug]` | Generisk webhook från integrationer |
| `/api/webhooks/stripe` | Stripe-specifik webhook med signaturverifiering |

**Saknas:** Utgående webhooks (Endoo → extern endpoint), webhook-delivery UI, webhook-retry UI, OpenAPI-spec, SDK, rate-limit enforcement.

---

## 12. Byråfunktioner

### Agency-klienthantering

| Funktion | Status | Route | Beskrivning |
|---------|--------|-------|-------------|
| Klientlista | ✅ | `/api/agency/clients` | Lista alla byråns klienter |
| Klientdetail | ✅ | `/api/agency/clients/[id]` | Hälsostatus, KPI:er |
| Impersonation | ✅ | `POST /api/auth/impersonate` | Agera som klient |
| Avsluta impersonation | ✅ | `POST /api/auth/exit-impersonation` | Återgå till byrå |
| Pinnede klienter | ✅ | `POST /api/agency/pins` | Pinne/avpinna klient |
| Bulk-operationer | ✅ | `POST /api/agency/bulk` | Massuppdatering av snapshots |
| Varningslista | ✅ | `/[orgSlug]/alerts` | Klienter med problem |

### `ClientSnapshot`-modellen

Förberäknad hälsostatus per byrå↔klient-par (uppdateras timvis via cron):
- `healthScore` 0–100
- `overdueInvoiceCount`, `overdueAmountOre`
- `unbookedSupplierCount`, `openAiAnomalyCount`
- `pendingAiSuggestionCount`
- `nextVatDeadlineAt`, `fiscalYearEndsAt`
- `onboardingDone`, `alerts` (JSON)

### White-label / Branding

| Funktion | Status | Route |
|---------|--------|-------|
| Logotyp-upload | ✅ | `POST /api/settings/branding/upload` |
| Primärfärg | ✅ | `PUT /api/settings/branding` |
| Visningsnamn | ✅ | `PUT /api/settings/branding` |
| Tillämpas i dashboard | ✅ | Via CSS-variabler `--brand-primary`, `--brand-accent` |
| Tillämpas i portal | ✅ | Kundportal visar byråns branding |

### `AgencyStaffAccess`

Granulär åtkomsthantering: en byråanställd kan ha olika `accessLevel` (`full`, `read_only`, `invoicing_only`) på olika klientkonton.

---

## 13. Kundportal

Separat autentiseringssystem — helt skilt från NextAuth.

### Auth-flöde

1. Kund besöker `/portal/[orgSlug]/login`
2. Anger e-post → `POST /api/portal/[orgSlug]/auth/send`
3. Magisk länk skickas till e-post (token giltig 10 min, engångsanvändning)
4. `GET /api/portal/[orgSlug]/auth/verify?token=...`
5. Server: SHA-256 hash → hitta `PortalMagicToken` → validera → sätt `portal_session` HttpOnly cookie
6. Cookie: JWT (jose, HS256, audience "endoo-portal"), 7-dagars TTL

### Portalsidor

| Sida | Route | Beskrivning |
|------|-------|-------------|
| Login | `/portal/[orgSlug]/login` | E-postformulär med magic link |
| Hem | `/portal/[orgSlug]` | Obetalda fakturor + väntande offerter |
| Fakturor | `/portal/[orgSlug]/invoices` | Lista med statusbadge |
| Fakturadetail | `/portal/[orgSlug]/invoices/[id]` | Rader, betalningar, PDF-länk |
| Offerter | `/portal/[orgSlug]/quotes` | Lista |
| Offertdetail | `/portal/[orgSlug]/quotes/[id]` | Totaler, godkänna/avvisa |
| Avtal | `/portal/[orgSlug]/contracts` | Lista med frekvens och status |

### Portal API-routes

| Route | Metod | Beskrivning |
|-------|-------|-------------|
| `/api/portal/[orgSlug]/auth/send` | POST | Skicka magic link (alltid 200) |
| `/api/portal/[orgSlug]/auth/verify` | GET | Validera token, sätt cookie |
| `/api/portal/[orgSlug]/auth/logout` | POST | Rensa cookie |
| `/api/portal/[orgSlug]/me` | GET | Inloggad kontakts profil |
| `/api/portal/[orgSlug]/invoices` | GET | Lista fakturor |
| `/api/portal/[orgSlug]/invoices/[id]` | GET | Fakturadetail |
| `/api/portal/[orgSlug]/invoices/[id]/pdf` | GET | PDF-nedladdning |
| `/api/portal/[orgSlug]/quotes` | GET | Lista offerter |
| `/api/portal/[orgSlug]/quotes/[id]` | GET | Offertdetail |
| `/api/portal/[orgSlug]/quotes/[id]/pdf` | GET | PDF-nedladdning |
| `/api/portal/[orgSlug]/contracts` | GET | Lista avtal |

**Tenant-isolering:** alla queries filtrerar på `{ contactId: claims.sub, organizationId: org.id }`.

**Saknas:** Onlinbetalning i portalen, chat/support, dokumentuppladdning, kontaktredigering, notifikationer.

---

## 14. Offerter och avtal

### `Quote`-modellen

| Fält | Beskrivning |
|------|-------------|
| `number` | Q-2026-0001 (auto-genererat) |
| `title` | Offerttitel |
| `status` | draft, sent, viewed, accepted, declined, expired, cancelled, invoiced, contracted |
| `lineItems` | JSON-array med rader (kr, ej öre) |
| `currency` | Valuta |
| `discount` | Decimal-rabatt |
| `discountType` | procent / fast belopp |
| `validUntil` | Giltighetsdatum |
| `approvalTokenHash` | SHA-256 för godkännandelänk |
| `convertedToInvoiceId` | FK vid konvertering |
| `convertedToContractId` | FK vid konvertering |

| Funktion | Status | Route |
|---------|--------|-------|
| Lista offerter | ✅ | `GET /api/quotes` |
| Skapa offert | ✅ | `POST /api/quotes` |
| Uppdatera offert | ✅ | `PUT /api/quotes/[id]` |
| Skicka offert | ✅ | `POST /api/quotes/[id]/send` |
| PDF | ✅ | `GET /api/quotes/[id]/pdf` |
| Konvertera → faktura | ✅ | `POST /api/quotes/[id]/convert-invoice` |
| Konvertera → avtal | ✅ | `POST /api/quotes/[id]/convert-contract` |
| Offentlig godkännandesida | ✅ | `/q/[token]` |
| API för godkännande | ✅ | `PUT /api/q/[token]` |
| Cron: utgångsbevakniing | ✅ | `/api/cron/quotes` |

### `RecurringSchedule` — Avtal

| Fält | Beskrivning |
|------|-------------|
| `contractNumber` | AVT-xxxx (auto-genererat) |
| `status` | draft, active, paused, ended, cancelled |
| `frequency` | weekly, biweekly, monthly, quarterly, yearly |
| `startDate` | Startdatum |
| `endDate` | Slutdatum (optional) |
| `nextIssueDate` | Nästa fakturadatum |
| `autoSend` | Skicka automatiskt till kund |
| `lines` | `RecurringScheduleLine[]` |

Cron `/api/cron/contracts` körs dagligen — skapar fakturor när `nextIssueDate` passeras.

### E-signering — `SignatureRequest`

| Fält | Beskrivning |
|------|-------------|
| `entityType` | contract / quote |
| `title` | Dokumenttitel |
| `documentSnapshotUrl` | URL till oföränderligt PDF-snapshot |
| `documentHash` | SHA-256 av dokumentet |
| `status` | draft, sent, partially_signed, completed, declined, expired, cancelled |
| `signers` | `Signer[]` med signeringsordning |

Offentlig signeringssida: `/sign/[token]`. Varje signer har unik token (SHA-256-hashad i DB).

---

## 15. Inställningar

### Settings-sidor

| Sida | Route | Fält | Status |
|------|-------|------|--------|
| Företagsinformation | `/settings/company` | Namn, org-nummer, moms-nr, adress, telefon, e-post, hemsida, bank, BG, PG, IBAN | ✅ |
| Fakturainställningar | `/settings/invoices` | Prefix, startnummer, valuta, momssats, betalningsvillkor, sidfot | ✅ |
| Betalningsinställningar | `/settings/payments` | Betalmetoder, swish-nr, stripe-koppling | ✅ |
| E-postinställningar | `/settings/email` | Avsändarnamn, svarsadress, e-postmall | ✅ |
| Säkerhet | `/settings/security` | Byt lösenord, aktiva sessioner | ✅ |
| Prenumeration | `/settings/subscription` | Aktuell plan, uppgradering, fakturering | ✅ |
| Användare | `/settings/users` | Bjud in, ändra roll, ta bort | ✅ |
| API-nycklar | `/settings/api` | Skapa/revokera API-nycklar, scopes | ✅ |
| Branding | `/settings/branding` | Logotyp-upload, primärfärg, visningsnamn | ✅ |
| Faktureringsinformation | `/settings/billing` | Stripe-portal-länk | ✅ |

### Settings API-routes

| Route | Metod | Beskrivning |
|-------|-------|-------------|
| `/api/settings/company` | GET/PUT | Företagsinformation |
| `/api/settings/invoices` | GET/PUT | Fakturainställningar |
| `/api/settings/payments` | GET/PUT | Betalningsinställningar |
| `/api/settings/email` | GET/PUT | E-postinställningar |
| `/api/settings/security/password` | PUT | Byt lösenord |
| `/api/settings/security/sessions` | GET/DELETE | Sessionshantering |
| `/api/settings/users` | GET | Lista members |
| `/api/settings/users/[memberId]` | PUT/DELETE | Uppdatera/ta bort member |
| `/api/settings/invitations/[id]` | DELETE | Återkalla inbjudan |
| `/api/settings/branding` | GET/PUT | Branding-inställningar |
| `/api/settings/branding/upload` | POST | Ladda upp logotyp |
| `/api/settings/billing` | GET | Prenumerationsinfo |

---

## 16. Säkerhet

### Auth-lager

| Lager | Implementering | Status |
|-------|----------------|--------|
| Session-auth | NextAuth v5 JWT + DB-session | ✅ |
| Portal-auth | Anpassad JWT (jose, HS256) i HttpOnly cookie | ✅ |
| API-nyckel-auth | SHA-256 hash-jämförelse | ✅ |
| 2FA | `totpSecret` (krypterat), `recoveryCodes` (hashade) i User-modellen | 🧠 UI saknas |

### Tenant-isolering

- Alla Prisma-queries filtrerar på `organizationId`
- Middleware verifierar org-membership via JWT
- Portal-JWT innehåller `orgSlug` — cross-org-request avvisas i `requirePortalAuth`
- Leverantörsfaktura-duplikatdetektering via `duplicateHash` (SHA-256)

### RBAC-enforcement

- `requirePermission(permission)` — Server Action helper
- `can(role, permission)` — statisk check
- Middleware: grov kontroll (auth/platform/org)
- Route handlers + RSC: finkornig kontroll via `requirePermission`

### Kryptering

- Bank-konto i `Organization`: krypterat (`bankAccount` encrypted)
- Integrations-credentials: AES-256-GCM (`encryptedAccessToken`, `encryptedRefreshToken`, `encryptedApiKey`)
- TOTP-hemlighet: krypterad
- Alla `*Hash`-fält: SHA-256 (API-nycklar, magic tokens, dokument-hash, etc.)

### Webhook-säkerhet

- Inkommande Stripe-webhooks: signaturverifiering med `stripe.webhooks.constructEvent`
- Inkommande integrationswebhooks: `webhookSecret` (HMAC)
- `signatureValid` loggas i `WebhookEvent`

### Audit trail

- `AuditLog` med 40+ händelsetyper
- `AccountingPeriodEvent` för period-låsningar
- `ApprovalVote` — immutable (kan ej ändras)
- `SignatureEvent` — immutable (IP, UserAgent, documentHash)
- `JournalEntryDimension.snapshotHash` — oföränderligt snapshot

**Saknas:** IP-baserad rate-limiting, brute-force-skydd på login, session-fingerprinting, CSRF-tokens (Next.js server actions hanterar delvis), CSP-headers, penetrationstest.

---

## 17. Infrastruktur och teknik

### Stack

| Komponent | Teknologi | Version |
|-----------|-----------|---------|
| Framework | Next.js | 15 (App Router) |
| Databas ORM | Prisma | latest |
| Databas | PostgreSQL | — |
| Auth | NextAuth v5 (Auth.js) | beta |
| Styling | Tailwind CSS | v4 (CSS-first) |
| Dark mode | next-themes | latest |
| PDF | @react-pdf/renderer | — |
| AI | Anthropic Claude API | — |
| Betalningar | Stripe | — |
| Storage | Vercel Blob | — |
| Portal JWT | jose | — |
| Deploy | Vercel | — |
| E-post | (konfigurerat i settings) | — |

### Cron-jobb (Vercel Crons)

| Job | Schema | Beskrivning |
|-----|--------|-------------|
| `/api/cron/contracts` | `0 6 * * *` | Generera fakturor från avtal |
| `/api/cron/reminders` | `0 7 * * *` | Skicka påminnelser för förfallna fakturor |
| `/api/cron/reindex-search` | `0 3 * * *` | Bygg om sökindex |
| `/api/cron/task-reminders` | `0 * * * *` | Påminnelser för uppgifter |
| `/api/cron/sign-reminders` | `0 * * * *` | Påminnelser för signeringsförfrågningar |
| `/api/cron/analytics-snapshot` | `0 * * * *` | Snapshottera analytics-data |
| `/api/cron/analytics-monthly` | `0 2 1 * *` | Månatlig analytics-aggregering |
| `/api/cron/quotes` | `0 6 * * *` | Markera utgångna offerter |
| `/api/cron/check-overdue` | — | Markera förfallna fakturor |
| `/api/cron/process-notification-jobs` | — | Skicka e-postnotifikationer |
| `/api/cron/process-webhooks` | — | Bearbeta väntande webhooks |
| `/api/cron/refresh-snapshots` | — | Uppdatera ClientSnapshot |
| `/api/cron/refresh-tokens` | — | Förnya OAuth-tokens för integrationer |
| `/api/cron/sync-integrations` | — | Synkronisera integrationer |
| `/api/cron/approval-reminders` | — | Påminnelser för attest |

### Middleware

`src/middleware.ts` — Edge-körning på varje request:
- Autentiseringskontroll
- Publika routes: `/`, `/login`, `/register`, `/pricing`, `/about`, `/privacy`, `/terms`, `/cookies`, `/funktioner`, `/byra`, `/artiklar`, `/konsulter`, `/smaforetag`, `/e-handel`, `/byra`, osv.
- Publika prefix: `/invite/`, `/sign/`, `/q/`, `/portal/`, `/api/auth/`, `/api/sign/`, `/api/q/`, `/api/portal/`, `/api/v1/`
- Platform admin guard för `/platform/**`
- Onboarding-redirect för användare utan aktiv org

---

## 18. Datamodell

### Alla Prisma-modeller

| Modell | Syfte | Tenant-scoped | Immutable |
|--------|-------|--------------|-----------|
| `Organization` | Tenant-konto | Platform | Nej |
| `User` | Global identitet | Platform | Nej |
| `OrganizationMember` | User↔Org-koppling | Ja | Nej |
| `AgencyClientRelationship` | Byrå↔Klient-länk | Platform | Nej |
| `AgencyStaffAccess` | Granulär klientåtkomst | Ja | Nej |
| `Session` | Auth-session | Platform | Nej |
| `Invitation` | Väntande inbjudan | Ja | Nej |
| `Contact` | Kund/leverantörskontakt | Ja | Nej |
| `ContactPerson` | Person på kontakt | Ja | Nej |
| `Invoice` | Faktura/kreditnota/proforma | Ja | Nej (void=immutable) |
| `InvoiceLineItem` | Fakturarad | Ja | Nej |
| `InvoiceLineItemDimension` | Dimensionsallokering per rad | Ja | Ja (vid posted journal) |
| `Payment` | Betalningsregistrering | Ja | Nej |
| `RecurringSchedule` | Avtalsmall | Ja | Nej |
| `RecurringScheduleLine` | Avtalsrad | Ja | Nej |
| `Product` | Produktkatalog | Ja | Nej |
| `InventoryItem` | Lagervara | Ja | Nej |
| `InventoryTransaction` | Lagertransaktion (ledger) | Ja | **Ja** |
| `Account` | Bokföringskonto | Ja | System-konton ja |
| `FiscalYear` | Räkenskapsår | Ja | Nej |
| `JournalSeries` | Verifikationsserie | Ja | Nej |
| `Journal` | Verifikat-header | Ja | **Ja** (posted) |
| `JournalEntry` | Verifikationsrad | Ja | **Ja** (posted) |
| `JournalEntryDimension` | Dimensionsallokering per rad | Ja | **Ja** (posted) |
| `DimensionAxis` | Dimensionsaxel | Ja | Nej |
| `Dimension` | Dimensionsvärde | Ja | Nej |
| `SupplierInvoiceDimension` | Dimension på lev.faktura | Ja | Nej |
| `AccountDimensionRule` | Obligatorisk dimension per konto | Ja | Nej |
| `AccountingPeriod` | Bokföringsperiod | Ja | Nej |
| `AccountingPeriodSnapshot` | Låsningssnapshat | Ja | **Ja** |
| `AccountingPeriodEvent` | Period-händelselogg | Ja | **Ja** |
| `Supplier` | Leverantörsregister | Ja | Nej |
| `SupplierInvoice` | Leverantörsfaktura | Ja | Nej |
| `ApprovalPolicy` | Attestpolicy-mall | Ja | Nej |
| `ApprovalPolicyStep` | Steg i policy | Ja | Nej |
| `ApprovalRequest` | Aktiv attstrunda | Ja | Nej |
| `ApprovalStep` | Steg i attstrunda | Ja | Nej |
| `ApprovalVote` | Röst (immutable) | Ja | **Ja** |
| `VatPeriod` | Momsredovisningsperiod | Ja | Nej |
| `Connection` | Integrationsanslutning | Ja | Nej |
| `WebhookEvent` | Inkommande webhook-logg | Ja | **Ja** |
| `SyncJob` | Synkjobb-post | Ja | Nej |
| `IntegrationLog` | Integrationshändelselog | Ja | **Ja** |
| `ExternalEntityMap` | Extern↔intern ID-mappning | Ja | Nej |
| `ImportFile` | Importfil-dedup | Ja | Nej |
| `NotificationEvent` | Notifikations-källhändelse | Ja | **Ja** |
| `ActivityFeedItem` | Aktivitetsflöde | Ja | Nej (soft delete) |
| `Notification` | Per-user inbox | Ja | Nej |
| `NotificationJob` | E-postleveranskö | Ja | Nej |
| `NotificationPreference` | Opt-out-inställningar | Ja | Nej |
| `ApiKey` | Extern API-nyckel | Ja | Nej |
| `IdempotencyKey` | Duplikatskydd | Ja | **Ja** (24h TTL) |
| `AiSuggestion` | AI-förslag | Ja | Nej |
| `AiAnomaly` | AI-avvikelse | Ja | Nej |
| `AiLog` | AI-anropslogg | Ja | **Ja** |
| `ClientSnapshot` | Byråhälsosnapshat | Platform | Nej |
| `BulkJob` | Massoperation | Platform | Nej |
| `AgencyClientPin` | Pinnede klienter | Platform | Nej |
| `SearchIndex` | Sökindex | Ja | Nej |
| `Task` | Uppgifter | Ja | Nej (soft delete) |
| `TaskAssignment` | Uppgiftstilldelning | Ja | Nej |
| `TaskComment` | Uppgiftskommentar | Ja | Nej (soft delete) |
| `SignatureRequest` | Signeringsförfrågan | Ja | Nej |
| `Signer` | Signerande part | Ja | Nej |
| `SignatureEvent` | Signeringshändelse | Ja | **Ja** |
| `Quote` | Offert | Ja | Nej |
| `PortalMagicToken` | Portalinloggningstoken | Ja | Nej |
| `AuditLog` | Revisionslogg | Ja | **Ja** |

**Totalt: ~65 modeller**

---

## 19. API-routes

### Auth

| Route | Metod | Auth | Status |
|-------|-------|------|--------|
| `/api/auth/[...nextauth]` | GET/POST | — | ✅ |
| `/api/auth/orgs` | GET | Session | ✅ |
| `/api/auth/switch-org` | POST | Session | ✅ |
| `/api/auth/impersonate` | POST | Session + agency:impersonate | ✅ |
| `/api/auth/exit-impersonation` | POST | Session | ✅ |
| `/api/auth/permissions` | GET | Session | ✅ |
| `/api/register` | POST | — | ✅ |
| `/api/onboarding` | POST | Session | ✅ |
| `/api/invitations/accept` | POST | — | ✅ |
| `/api/invitations` | POST | Session | ✅ |

### Fakturor

| Route | Metod | Permission | Status |
|-------|-------|------------|--------|
| `/api/invoices` | GET/POST | invoices:read / invoices:create | ✅ |
| `/api/invoices/[id]` | GET/PUT/DELETE | invoices:read / update / delete | ✅ |
| `/api/invoices/[id]/send` | POST | invoices:send | ✅ |
| `/api/invoices/[id]/void` | POST | invoices:void | ✅ |
| `/api/invoices/[id]/pdf` | GET | invoices:read | ✅ |
| `/api/invoices/[id]/payments` | GET/POST | payments:read / create | ✅ |
| `/api/invoices/[id]/payments/[paymentId]` | DELETE | payments:delete | ✅ |
| `/api/invoices/[id]/credit-note` | POST | invoices:create | ✅ |
| `/api/invoices/[id]/convert-proforma` | POST | invoices:update | ✅ |

### Kontakter

| Route | Metod | Permission | Status |
|-------|-------|------------|--------|
| `/api/contacts` | GET/POST | contacts:read / create | ✅ |
| `/api/contacts/[id]` | GET/PUT/DELETE | contacts:read / update / delete | ✅ |
| `/api/contacts/[id]/history` | GET | contacts:read | ✅ |
| `/api/contacts/[id]/persons` | GET/POST | contacts:read / update | ✅ |
| `/api/contacts/[id]/persons/[personId]` | PUT/DELETE | contacts:update / delete | ✅ |

### Bokföring (urval)

| Route | Metod | Permission | Status |
|-------|-------|------------|--------|
| `/api/journals` | GET/POST | accounting:read / create | ✅ |
| `/api/journals/[id]` | GET/PUT | accounting:read / update | ✅ |
| `/api/accounting/journals/[id]/void` | POST | accounting:void | ✅ |
| `/api/accounting/accounts` | GET/POST | accounting:read / create | ✅ |
| `/api/accounting/periods` | GET | accounting:read | ✅ |
| `/api/accounting/periods/[id]/lock` | POST | accounting:lock | ✅ |
| `/api/reports/balance-sheet` | GET | reports:read | ✅ |
| `/api/reports/income-statement` | GET | reports:read | ✅ |
| `/api/reports/general-ledger` | GET | reports:read | ✅ |
| `/api/reports/trial-balance` | GET | reports:read | ✅ |
| `/api/reports/vat` | GET | reports:read | ✅ |
| `/api/sie/export` | GET | reports:export | ✅ |
| `/api/tax/vat-periods` | GET/POST | accounting:read | ✅ |

### Leverantörsfakturor (urval)

| Route | Metod | Permission | Status |
|-------|-------|------------|--------|
| `/api/supplier-invoices` | GET/POST | supplier_invoices:read / create | ✅ |
| `/api/supplier-invoices/[id]/extract` | POST | supplier_invoices:extract | ✅ |
| `/api/supplier-invoices/[id]/book` | POST | supplier_invoices:book | ✅ |
| `/api/supplier-invoices/[id]/pay` | POST | supplier_invoices:pay | ✅ |
| `/api/supplier-invoices/[id]/approval-requests` | POST | supplier_invoices:approve | ✅ |
| `/api/approval-inbox` | GET | supplier_invoices:approve | ✅ |

### Portal (offentlig med JWT-cookie)

| Route | Metod | Auth | Status |
|-------|-------|------|--------|
| `/api/portal/[orgSlug]/auth/send` | POST | — | ✅ |
| `/api/portal/[orgSlug]/auth/verify` | GET | — | ✅ |
| `/api/portal/[orgSlug]/auth/logout` | POST | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/me` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/invoices` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/invoices/[id]` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/invoices/[id]/pdf` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/quotes` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/quotes/[id]` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/quotes/[id]/pdf` | GET | Portal-cookie | ✅ |
| `/api/portal/[orgSlug]/contracts` | GET | Portal-cookie | ✅ |

### Offentliga API-routes (ingen auth)

| Route | Beskrivning | Status |
|-------|-------------|--------|
| `/api/q/[token]` | Offert-godkännandetoken | ✅ |
| `/api/sign/[token]` | Signeringstoken | ✅ |
| `/api/webhooks/stripe` | Stripe-webhook | ✅ |
| `/api/webhooks/[slug]` | Integrationswebhook | ✅ |

### Extern REST API (v1)

| Route | Auth | Status |
|-------|------|--------|
| `/api/v1/invoices` | API-nyckel | ✅ |
| `/api/v1/contacts` | API-nyckel | ✅ |
| `/api/v1/products` | API-nyckel | ✅ |
| `/api/v1/journals` | API-nyckel | ✅ |
| `/api/v1/inventory` | API-nyckel | ✅ |

**Totalt: ~130 API-routes**

---

## 20. Saknade funktioner och rekommendationer

### ❌ Kritiska funktioner som saknas

| Funktion | Prioritet | Anledning |
|---------|-----------|-----------|
| **Plan-gating** | 🔴 Hög | `Plan`-enum finns men inget som blockerar funktioner baserat på plan — alla får allt |
| **BAS-kontoplan förimporterad** | 🔴 Hög | Schema stöder BAS men ingen seed-data finns |
| **2FA UI** | 🔴 Hög | `totpSecret` i DB men ingen UI för att aktivera/avaktivera |
| **Email-provider konfiguration** | 🔴 Hög | `email.ts` finns men oklar hur transaktionell e-post faktiskt levereras |
| **Onboarding-flöde** | 🟡 Medium | `/onboarding`-sida finns men är minimal |
| **Rate-limiting på API** | 🟡 Medium | `rateLimit`-fält på `ApiKey` men ej implementerat i middleware |
| **Utgående webhooks** | 🟡 Medium | Bara inkommande webhooks implementerade |
| **OpenAPI-spec / Swagger** | 🟡 Medium | `/api/v1` finns men ingen dokumentation |
| **PDF-export av rapporter** | 🟡 Medium | Rapporter visas i UI men kan ej exporteras |
| **Schemalagda e-postrapporter** | 🟡 Medium | — |
| **Bankgiro-betalfil (BGMax)** | 🟡 Medium | Leverantörsbetalningar saknar exportformat |
| **Avvikelsedetektering UI** | 🟡 Medium | `AiAnomaly`-modell finns, men ingen sida |
| **Lagervarningar** | 🟡 Medium | `reorderPoint` finns men ingen alert |
| **CSV/Excel-import** | 🟡 Medium | Kontakter, produkter, fakturor |
| **Kontakt-sammanslagning** | 🟡 Medium | Dubblettkontakter kan uppstå |
| **Kreditkortsbetalning i portal** | 🟡 Medium | Kunder kan inte betala online direkt |

### 🔴 Tekniska risker

| Risk | Beskrivning | Åtgärd |
|------|-------------|--------|
| **Ingen plan-gating** | Alla kunder får enterprise-funktioner gratis | Implementera `plan`-checks i requirePermission |
| **BigInt i API-svar** | BigInt serialiseras inte till JSON automatiskt | Kontrollera alla API-routes, lägg till toJSON-wrapper |
| **Portal-token expiry** | Magic-link-tokens rensas inte automatiskt | Lägg till cron för att rensa gamla `PortalMagicToken` |
| **Krypterade fält i schema** | `bankAccount`, `totpSecret`, `encryptedAccessToken` kräver krypteringsnyckel i env | Verifiera att `ENCRYPTION_KEY` hanteras korrekt i produktion |
| **Journal-immutabilitet** | Om applikationslogik buggat kan ett posted journal ändras — inget DB-constraint | Lägg till DB-triggers eller applikationsnivå-guard |
| **Ingen index på `organizationId`** | Kan bli prestanda-problem vid tillväxt | Verifiera Prisma-index på alla tenant-scoped modeller |

### 🟡 UX-problem

| Problem | Beskrivning |
|---------|-------------|
| **Sidebar-menyar utan sub-sidor** | Lager, Analys, Bokföring saknar sub-navigation |
| **Inga empty states** | De flesta listsidor visar tom tabell utan guide vid 0 poster |
| **Ingen sökning i dropdown-listor** | Kontaktval i ny faktura kan bli svårt med 1000+ kunder |
| **Mobil-erfarenhet** | Fakturaformuläret är troligen svårt på mobil |
| **Ingen bekräftelsedialog** | Destruktiva actions (void, delete) saknar confirm-steg på vissa ställen |

### 🟢 Prioriterade nästa steg (rekommendation)

1. **Plan-gating** — avgörande för monetisering
2. **BAS-kontoplans-seed** — krävs för att bokföring ska vara användbar dag 1
3. **E-postleverantör-konfiguration** — säkerställ att Resend/Sendgrid/SES fungerar i produktion
4. **2FA UI** — säkerhetskrav för B2B-kunder
5. **Avvikelsedetektering UI** — AI-funktionen är byggd men dold
6. **Utgående webhooks** — låser upp integrationer
7. **OpenAPI-spec** — krävs för extern API-adoption
8. **Onboarding-wizard** — minskar churn för nya användare
9. **CSV-import** — vanligaste onboarding-hinder
10. **Lagervarningar** — slutför lagermodulen

---

*Dokument genererat automatiskt från kodbasen. Uppdatera vid nya features.*
