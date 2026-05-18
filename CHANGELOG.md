# Changelog

Alla noterbara ändringar i Endoo dokumenteras här.

Formatet bygger på [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/)
och projektet följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Unreleased]

## [0.12.0] - 2026-05-18

### Added
- **[Periodiseringar]** Prisma-modeller `Accrual` och `AccrualPeriod` med enums `AccrualType`, `AccrualStatus`, `AccrualPeriodStatus` samt migration `20250518_accruals`
- **[Periodiseringar]** `src/lib/accounting/accruals/periods.ts` — `calculateAccrualPeriods()` och `monthsBetween()`: delar totalbelopp jämnt över månader i öre med BigInt; rest hamnar i sista perioden
- **[Periodiseringar]** `src/lib/accounting/accruals/post.ts` — `postAccrualPeriod()`: skapar kombinerat verifikat för alla planerade periodiseringar en given månad; `reverseAccrual()`: makulerar bokförda verifikat och markerar periodiseringen återförd
- **[API]** `GET/POST /api/accounting/accruals` — lista och skapa periodiseringar med direktgenererade perioder
- **[API]** `GET/PUT/DELETE /api/accounting/accruals/[id]` — detalj, uppdatering och radering
- **[API]** `POST /api/accounting/accruals/[id]/reverse` — återför periodisering (makulerar verifikat)
- **[API]** `GET /api/accounting/accruals/preview?period=YYYY-MM` — förhandsgranska planerade perioder utan att bokföra
- **[Cron]** `GET /api/cron/accruals-monthly` — bokför föregående månads periodiseringar för alla org:ar med planerade perioder (schema: 1:e varje månad kl 03:00)
- **[UI]** Sidor: `/accounting/accruals` (lista med framsteg och sökning), `/accounting/accruals/new` (formulär med livegranskning av perioddistribution), `/accounting/accruals/[id]` (detalj, periodtabell, återföringsknapp)
- **[UI]** "Periodisera"-knapp på leverantörsfaktura-detalj (bokförd/betald) och kundfaktura-detalj (skickad/betald) — förifyller nytt periodiseringsformulär via searchParams
- **[UI]** Sidebar: "Periodiseringar" under Bokföring (gated på `accruals`-feature, pro+)
- **[RBAC]** `ACCRUAL_PERMISSIONS` (read/create/update/delete/reverse) — tilldelade till owner/admin/staff/viewer per roll
- **[Plans]** Feature `accruals` tillagd — aktiverad från `pro`-plan och uppåt
- **[Tests]** 13 enhetstester i `tests/accounting/accruals.test.ts` — täcker perioddistribution med BigInt-rest, idempotens, återföring, tenant-isolation

### Database
- **[Periodiseringar]** Migration `20250518_accruals`: skapar `accruals` och `accrual_periods` tabeller med enums, index och FK-constraints

## [0.11.0] - 2026-05-18

### Added
- **[Anläggningstillgångar]** Prisma-modeller `FixedAsset` och `DepreciationSchedule` med enums `DepreciationMethod`, `FixedAssetStatus`, `DepreciationScheduleStatus` samt migration `20250518_fixed_assets`
- **[Anläggningstillgångar]** `src/lib/accounting/fixed-assets/schedule.ts` — `calculateSchedule()`: genererar full avskrivningsplan för linjär, degressiv och räkenskapsenlig (30%) metod
- **[Anläggningstillgångar]** `src/lib/accounting/fixed-assets/depreciation.ts` — `postPeriodDepreciation()` och `previewPeriod()`: bokför månadsavskrivningar som verifikat och uppdaterar `DepreciationSchedule.status`
- **[Anläggningstillgångar]** `src/lib/accounting/fixed-assets/dispose.ts` — `disposeAsset()`: bokför utrangeringsverifikat (DR ackumulerad avskrivning, CR tillgångskonto, DR likvid, DR/CR vinst/förlust 3973/7973)
- **[API]** `GET/POST /api/fixed-assets` — lista och skapa anläggningstillgångar
- **[API]** `GET/PATCH/DELETE /api/fixed-assets/[id]` — detalj, uppdatering och radering
- **[API]** `POST /api/fixed-assets/[id]/dispose` — utrangera tillgång med bokföring
- **[API]** `GET /api/fixed-assets/[id]/depreciation-schedule` — hämta avskrivningsplan
- **[API]** `GET /api/depreciation/preview?period=YYYY-MM` — förhandsgranska period utan att bokföra
- **[API]** `POST /api/depreciation/post` — bokför avskrivningar för en period
- **[Cron]** `GET /api/cron/depreciation-monthly` — bokför föregående månads avskrivningar för alla org:ar med aktiva tillgångar (schema: 1:e varje månad)
- **[UI]** Sidor: `/fixed-assets` (lista), `/fixed-assets/new` (formulär), `/fixed-assets/[id]` (detalj + utrangering), `/depreciation` (periodöversikt + bokföring)
- **[UI]** Sidebar: "Anläggningstillgångar" och "Avskrivningar" under Bokföring (gated på `fixed_assets`-feature)
- **[RBAC]** `FIXED_ASSET_PERMISSIONS` (read/create/update/dispose/delete) och `DEPRECIATION_PERMISSIONS` (read/post/reverse) — tilldelade till owner/admin/staff/viewer per roll
- **[Plans]** Feature `fixed_assets` tillagd — aktiverad från `pro`-plan och uppåt

### Database
- **[Anläggningstillgångar]** Migration `20250518_fixed_assets`: skapar `fixed_assets` och `depreciation_schedules` tabeller med enums, index och FK-constraints

## [0.10.2] - 2026-05-18

### Fixed
- **[Faktura]** "Registrera betalning" visades dubbelt på förfallna fakturor — det separata `overdue`-blocket var redundant eftersom `overdue` alltid är sant när status är "sent"/"viewed"/"partial", vilket redan täcks av blocket ovanför

## [0.10.1] - 2026-05-18

### Fixed
- **[PDF]** `@react-pdf/renderer` kraschar på Vercel — lagt till `serverExternalPackages: ["@react-pdf/renderer"]` i next.config.ts och `export const runtime = "nodejs"` på alla PDF-routes (invoice, quote, portal-invoice, portal-quote, send)
- **[Design]** AI-sektionen på landningssidan använde `from-white to-indigo-50/40` (hårdkodad vit) — i dark mode skapade det vit bakgrund med ljus text = oläsbart. Ersatt med `bg-card` som fungerar i båda lägen

## [0.10.0] - 2026-05-18

### Added
- **[Årsavslut]** `src/lib/accounting/year-end/close.ts` — orchestrator `closeFiscalYear()`: validering, omföring (klass 3–8 → 2099), IB-verifikat för nästa räkenskapsår, SHA-256 bokslutsHash och oföränderliga JSON-snapshots av balans- och resultaträkning
- **[Årsavslut]** `src/lib/accounting/year-end/reopen.ts` — `reopenFiscalYear()`: makulerar omförings- och IB-verifikat, återställer perioder till "locked", rensar stängningsmetadata; kräver `super_admin`
- **[API]** `POST /api/accounting/fiscal-years/[id]/year-end/validate` — kör förvalidering utan att ändra data
- **[API]** `POST /api/accounting/fiscal-years/[id]/year-end/close` — genomför årsavslut (kräver `accounting:year_end:close`)
- **[API]** `POST /api/accounting/fiscal-years/[id]/year-end/reopen` — återöppnar avslutat år (`super_admin` only)
- **[API]** `GET /api/accounting/fiscal-years/[id]/year-end/closing-statements` — hämtar oföränderliga snapshots från stängningstillfället
- **[API]** `GET /api/accounting/fiscal-years` — listar alla räkenskapsår för organisationen
- **[Frontend]** `/(dashboard)/[orgSlug]/year-end/page.tsx` — översiktssida med status per räkenskapsår
- **[Frontend]** `/(dashboard)/[orgSlug]/year-end/[id]/wizard/page.tsx` — 5-stegs guide: validering → omföringsförhandsvisning → IB-förhandsvisning → bekräftelse → klart
- **[Frontend]** `/(dashboard)/[orgSlug]/year-end/[id]/download/page.tsx` — bokslutspaket med balans- och resultaträkning + integritetshash
- **[Sidebar]** "Årsavslut" tillagt under Bokföring-sektionen
- **[RBAC]** `ACCOUNTING_PERMISSIONS.YEAR_END_READ/CLOSE/REOPEN` — nya rättigheter; owner + admin + staff + viewer tilldelas rätt nivå

### Database
- **[Migration]** `20250518_fiscal_year_closing`: nio nya kolumner på `fiscal_years` — `closing_journal_id`, `opening_journal_id`, `closing_hash`, `closed_at`, `closed_by_id`, `reopened_at`, `reopened_by_id`, `closed_balance_sheet_snapshot` (JSONB), `closed_income_statement_snapshot` (JSONB)

### Added (Tests)
- **[Tester]** `tests/accounting/year-end.test.ts` — 8 testfall: valideringsblockering, balanserat omföringsverifikat, tenant-isolering, reopen-logik, snapshot-oföränderlighet

## [0.9.0] - 2026-05-18

### Changed
- **[Migrering]** Kört säker klassmigrering i tre omgångar — totalt ~3700 className-block uppdaterade från `text-gray-*`/`bg-white`/`bg-gray-*`/`border-gray-*` till semantiska tokens i ~150 filer; TypeScript 0 fel
- **[Audit-script]** `scripts/audit-colors.ts` — `text-white` och `opacity-50` flyttade till varningar, e-postmallar undantagna (`src/lib/email.ts`, `src/lib/signing/`, m.fl.), `bg-white/[opacity]`-varianter undantagna (avsiktliga överlager), `// audit-ok`-suppression för hex i API-defaults och diagram-paletter
- **[Migrations-script]** `scripts/migrate-colors.ts` fullständigt omskriven med säker single-pass-regex (inga överlappande block, inga JSX-korruptioner), `text-slate-*` tillagd i regelverket
- **[Portal-sidor]** Alla 10 portalsidor (invoices, quotes, contracts, login, sessions m.fl.) — hårdkodade hex-värden ersatta med CSS-variabler (`var(--foreground)`, `var(--muted-foreground)`, `var(--primary)`, `var(--destructive)` m.fl.)
- **[Analytics]** `analytics/page.tsx` + `src/lib/analytics/chart-colors.ts` — SVG-strokes/fills och textklasser migrerade; diagrampalett extraherad till `CHART`-konstant med `// audit-ok`
- **[Org-switcher]** `org-switcher.tsx` — omskriven från inline `style={}`-objekt till Tailwind semantiska klasser
- **[Övrigt]** `BottomSheet`, `CookieBanner`, `HealthBar`, `MobileNavBar`, `ImpersonationBanner`, `CommandPalette`, `NotificationDrawer`, `TaskDrawer`, `AiDrawer` m.fl. — alla återstående grå-klasser åtgärdade

### Added
- **[Verktyg]** `src/lib/analytics/chart-colors.ts` — gemensam diagrampalett (`CHART.*`)

### Fixed
- **[Audit]** `npm run audit:colors` returnerar nu **0 errors** (ner från 2797 vid start) — pre-commit hook blockerar framtida regressioner

## [0.8.0] - 2026-05-18

### Changed
- **[Färgsystem]** `src/app/globals.css` omskriven — komplett semantiskt system med oklch()-variabler (`--foreground`, `--card`, `--muted-foreground`, `--primary`, `--success`, `--warning`, `--info`, `--sidebar-*` m.fl.) i både light och dark mode med WCAG AA-kontrast
- **[Komponenter]** `Card`, `Button`, `Input`, `Select` — alla ersätter `bg-white`/`text-gray-*` med `bg-card`/`text-foreground`/`text-muted-foreground` etc.; fungerar nu korrekt i dark mode
- **[Sidebar]** `Sidebar`, `MobileNavBar` — alla grå-klasser ersatta med `bg-sidebar`, `text-sidebar-foreground`, `hover:bg-sidebar-accent` etc.
- **[ThemeToggle]** Utökad till 3-state dropdown (Ljust / Mörkt / System) med tillgänglig `listbox`-roll
- **[Migration]** 2703 automatiska class-ersättningar i 124 filer via `scripts/migrate-colors.ts`

### Added
- **[Komponenter]** `src/components/ui/StatusBadge.tsx` — single source of truth för alla status-färger (25+ statustillstånd); använder semantiska tokens, fungerar i båda lägen
- **[Tema]** Flash-of-wrong-theme-fix: inline script i `<head>` läser `localStorage`-tema och sätter klass/colorScheme innan React hydrerar
- **[PDF]** `src/lib/pdf/colors.ts` — hårdkodade light-mode-konstanter för react-pdf-templates
- **[Design system]** `src/lib/design-system/contrast.ts` — `contrastRatio()`, `getBestTextColor()`, `adjustForDarkMode()`, `hexToOklch()` för branding-override med automatisk kontrast
- **[Design system]** `src/lib/design-system/COLOR_RULES.md` — utvecklarkonventioner för semantiska färgklasser
- **[Platform UI]** `/platform/design-system` — intern docs-sida (super_admin) med alla tokens, StatusBadge-varianter och typografi
- **[API]** `GET /api/design/contrast-check` — utility-endpoint för att validera brand-färger mot WCAG AA
- **[Verktyg]** `scripts/audit-colors.ts` — skannar `src/` och rapporterar icke-semantiska Tailwind-klasser; skriver `.audit/color-issues.json`
- **[Verktyg]** `scripts/migrate-colors.ts` — auto-migration med `--dry-run`-stöd
- **[npm-scripts]** `audit:colors`, `migrate:colors`, `migrate:colors:apply`
- **[Pre-commit]** Hook blockerar commit om `audit:colors --max-errors 0` misslyckas
- **[CLAUDE.md]** Obligatoriska färgregler tillagda

### Fixed
- **[Dark mode]** Text knappt synlig i dark mode: `Card`/`Button` använde `bg-white` utan dark-variant — nu `bg-card` med `text-card-foreground`
- **[CookieBanner]** `bg-white dark:bg-gray-900` → `bg-card`; toggle-knapparna använder semantiska klasser

## [0.7.1] - 2026-05-18

### Fixed
- **[PageSpeed]** `src/app/robots.ts` skapad — löser "robots.txt är inte giltig"; tillåter `/`, blockerar `/api/`, `/platform/`, `/portal/`
- **[PageSpeed]** `CookieBanner` — länktext "Läs mer" ändrad till "Läs cookiepolicyn" för att uppfylla Lighthouse-krav på beskrivande länktext
- **[PageSpeed]** `CookieBanner` laddas nu som dynamisk import med `ssr: false` i root layout — tar bort ~21 KiB från initial bundle
- **[PageSpeed]** `browserslist` tillagd i `package.json` med `"defaults and supports es6-module"` — eliminerar onödiga ES5-polyfiller för moderna webbläsare (~12 KiB)

## [0.7.0] - 2026-05-18

### Added
- **[Portal-säkerhet]** `PortalAuthAttempt`-modell — oföränderlig log för alla verify-försök (ip, userAgent, success, failureReason)
- **[Portal-säkerhet]** `TrustedDevice`-modell — betrodda enheter per kontakt med deviceId (UUID), ipPrefix, revokedAt
- **[Portal-säkerhet]** `PortalMagicToken` utökad med `requestIp`, `userAgent`, `pendingCode` (SHA-256-hash av 6-siffrig kod)
- **[Portal-säkerhet]** IP-prefix-jämförelse vid verify (/24 för IPv4, 4 grupper för IPv6) — mismatch triggar 6-siffrig säkerhetskod-utmaning
- **[Portal-säkerhet]** DB-baserad rate limiting: 5 send/email/timme via PortalMagicToken-räkning; 10 verify/IP/timme via PortalAuthAttempt-räkning
- **[Portal-säkerhet]** `POST /api/portal/[orgSlug]/auth/verify-code` — validerar 6-siffrig kod, slutför inloggning
- **[Portal-säkerhet]** `GET /api/portal/[orgSlug]/sessions` — lista betrodda enheter
- **[Portal-säkerhet]** `POST /api/portal/[orgSlug]/sessions` — lita på aktuell enhet (sätter HttpOnly trusted-device-cookie, 30 dagar)
- **[Portal-säkerhet]** `DELETE /api/portal/[orgSlug]/sessions/[id]` — återkalla betrodd enhet
- **[Portal-säkerhet]** `ipPrefix()`, `getClientIp()`, `signTrustedDeviceJwt()`, `verifyTrustedDeviceJwt()` i `src/lib/portal/auth.ts`
- **[Portal-säkerhet]** `sendPortalSecurityCode()` i `src/lib/portal/emails.ts` — skickar 6-siffrig kod via e-post
- **[Portal-UI]** `/portal/[orgSlug]/auth/verify` — sida för IP-mismatch kod-inmatning med monospace-kodvisning
- **[Portal-UI]** `/portal/[orgSlug]/profile/sessions` — hantera betrodda enheter (lista + återkalla)
- **[Portal-UI]** Avsändarledtråd ("noreply@mail.endoo.se") på inloggningssidans bekräftelseskärm
- **[Cron]** `GET /api/cron/cleanup-tokens` (04:00 UTC dagligen) — rensar utgångna PortalMagicToken (>7d), PortalAuthAttempt (>90d), återkallade TrustedDevice (>30d), transient EmailSuppression (>90d)
- **[Tester]** `tests/security/portal-auth-hardening.test.ts` — 12 tester för cleanup-cron, rate limiting, IP-mismatch, trusted device och återkallning

### Database
- **[Portal-säkerhet]** Ny modell `PortalAuthAttempt`: immutable auth-log med index på `[ip, createdAt]`
- **[Portal-säkerhet]** Ny modell `TrustedDevice`: `deviceId @unique @default(uuid)`, `ipPrefix`, `revokedAt?`
- **[Portal-säkerhet]** `PortalMagicToken` fält tillagda: `requestIp String?`, `userAgent String?`, `pendingCode String?`

## [0.6.0] - 2026-05-18

### Added
- **[Säkerhetstester]** `tests/security/tenant-isolation.test.ts` — 26 tester som verifierar att inga routes läcker data mellan tenants; täcker Contacts, Invoices, Products, Quotes, Journals, Payments, Search, Reports, Portal och Impersonering
- **[Säkerhetstester]** `tests/security/helpers.ts` — `createMockPrisma()` (oracle-mock), `assertNoLeak()`, `makeCtx()`, `seedOrgBResource()`
- **[Säkerhetstester]** `tests/security/fixtures.ts` — deterministiska org-IDs, mock-resurser och `FORBIDDEN_STRINGS` för Org B
- **[Route-introspektör]** `scripts/scan-routes.ts` — skannar `src/app/api/` rekursivt och skriver `tests/_route-manifest.json` med 173 routes kategoriserade som tenant/platform/portal/v1/public/cron
- **[Prisma-audit]** `scripts/audit-prisma.ts` — statisk analys som flaggar Prisma-anrop utan `organizationId`-filter; stödjer `--strict`-läge (avslut 1) och `// audit-ok`-annotation
- **[CI]** `.github/workflows/security.yml` — blockerar merge vid fel på tenant-isoleringstest, Prisma-audit och TypeScript-typkontroll
- **[Platform UI]** `/platform/security/audit-report` — super_admin-sida med route-manifest och Prisma-audit-resultat
- **[Behörigheter]** `platform:security:read` — ny behörighet för säkerhetsaudit-sidan (tilldelad `super_admin`)
- **[Dokumentation]** `SECURITY.md` — tenant-isoleringsmodell, säkerhetsrapportering och testdokumentation
- **[npm-scripts]** `scan-routes`, `audit:prisma`, `audit:prisma:strict`, `test:security`

### Changed
- **[CLAUDE.md]** Lagt till obligatoriska regler för nya tenant-scoped routes: 404 vs 403, Prisma-filter, testkrav
- **[Prisma-audit]** Lagt till `// audit-ok`-annotationer på 5 "fetch-then-verify"-mönster; `userAccount` och `agencyClientRelationship` vitlistade som icke-tenant-scopade modeller

### Security
- **[Audit]** `audit-prisma.ts --strict` passerar med 0 misstänkta frågor på hela `src/`-kodbasen

## [0.5.1] - 2026-05-18

### Added
- **[BigInt-serialisering]** `src/instrumentation.ts` — global `BigInt.prototype.toJSON`-patch vid server-startup; gör alla `Response.json()`-anrop säkra utan ändringar i befintlig kod
- **[BigInt-serialisering]** `src/lib/serialize.ts` — `toJSON()`, `parseMoney()`, `serializeMoney()`, `Money`/`RichMoney`-typer
- **[API-helpers]** `src/lib/api/response.ts` — `apiOk()`, `apiError()`, `apiPaginated()`, `apiCursor()` med inbyggd BigInt-säker serialisering
- **[Pengaformat]** `src/lib/format/money.ts` — `formatMoney()`, `parseMoneyInput()`, `formatMoneyInput()` för display och input-tolkning
- **[UI-komponenter]** `MoneyInput` — kontrollerat inmatningsfält, emitterar öre-sträng, accepterar komma/punkt som decimaltecken
- **[UI-komponenter]** `MoneyDisplay` — read-only penningvisning med `showSign`- och `blankZero`-flaggor
- **[Dokumentation]** `CONTRIBUTING.md` — pengarhanteringsregler, anti-mönster, trådformat och komponentöversikt
- **[Tester]** 34 tester i `src/__tests__/lib/serialize.test.ts`, `format/money.test.ts`, `api/v1-bigint.test.ts`

### Changed
- **[API-refaktorering]** v1-routes (`invoices`, `contacts`, `products`, `journals`, `inventory`) migrerade till `apiCursor`-helper — borttagna inline `ser()`/`serializeInvoice()`-funktioner
- **[API-refaktorering]** Portal-routes (`contracts`, `invoices`, `invoices/[id]`, `me`, `quotes`, `quotes/[id]`, `auth/send`) migrerade till `apiOk`-helper
- **[API-refaktorering]** `withApiAuth` `Handler`-typ breddad till `Promise<Response>` för att stödja web-standard `Response` (ej bara `NextResponse`)
- **[API-helpers]** `src/lib/api/handle-error.ts` — använder nu `apiError()` från `@/lib/api/response`
- **[Typer]** `src/types/index.ts` — lade till `Money`-typ för externt API-kontrakt

## [0.5.0] - 2026-05-18

### Added
- **[E-post infrastruktur]** `src/lib/email/client.ts` — singleton Resend-klient med env-config (`RESEND_FROM_DOMAIN`, `RESEND_FROM_NAME`, `RESEND_WEBHOOK_SECRET`)
- **[E-post infrastruktur]** `src/lib/email/send.ts` — provider-agnostisk `sendEmail()` med React Email-stöd, bilagor och idempotensnycklar
- **[E-post mallar]** 11 React Email-komponenter i `src/emails/`: `InvoiceSentEmail` (radartikeltabell), `InvoiceReminderEmail`, `InvoiceOverdueEmail`, `QuoteSentEmail`, `ContractSignatureRequestEmail`, `PortalMagicLinkEmail`, `WelcomeEmail`, `InvitationEmail`, `PasswordResetEmail`, `ApprovalRequestEmail`, `WeeklyAgencyDigestEmail`
- **[E-post spårning]** `EmailDelivery`-poster skapas vid varje utskick — lagrar mottagare, ämne, Resend-ID, status och events-tidslinje
- **[E-post spårning]** `POST /api/webhooks/resend` — HMAC-signaturverifiering, hantering av sent/delivered/delayed/bounced/complained/opened/clicked
- **[E-post spårning]** `GET /api/invoices/[id]/email-delivery` — senaste leveransstatus för en faktura
- **[E-post spårning]** `EmailDeliveryStatusBadge`-komponent på fakturadetalj-sidan
- **[Suppressionslista]** Hard bounces + klagomål skapar `EmailSuppression`-poster; 2+ hårda studsningar rensar `Contact.email` och skapar `AuditLog` + `ActivityFeedItem`
- **[Suppressionslista]** `POST /api/email/suppression/remove` — ta bort adress från suppressionslistan
- **[Suppressionskontroll]** Notifieringskön kontrollerar suppressionslistan och sätter jobb till `skipped`
- **[Domänverifiering]** `GET/POST /api/settings/email/domain` — anpassad avsändardomän via Resend Domains API med DNS-poster
- **[Domänverifiering]** `POST /api/settings/email/domain/verify` — verifiera DNS-poster
- **[Testutskick]** `POST /api/settings/email/test-send` — testmejl med `EmailDelivery`-loggning
- **[E-postlogg]** `GET /api/audit/email-logs` — paginerad logg filtrerbar på status och e-postadress
- **[E-postlogg]** `settings/email/logs` — ny loggsida med expanderbar händelsetidslinje per utskick
- **[Inställningar]** Uppdaterad `settings/email`-sida: custom domain-setup, DNS-instruktioner, verify-knapp, testutskick-sektion
- **[Navigering]** "E-postlogg"-submeny i sidomenyn (visas på `/settings/email*`-sidor)
- **[RBAC]** `EMAIL_PERMISSIONS`: `audit:email_logs:read`, `settings:email:update`
- **[Env]** `.env.example` utökat med `RESEND_FROM_DOMAIN`, `RESEND_FROM_NAME`, `RESEND_WEBHOOK_SECRET`

### Changed
- **[E-post infrastruktur]** `process-notification-jobs` — ersätter direkt Resend-anrop med `sendEmail()`, suppression-check och `EmailDelivery`-spårning

### Database
- **[E-post spårning]** Ny modell `EmailDelivery`: events (JSON-array), openedAt, clickedAt, deliveredAt, bouncedAt, providerMessageId
- **[Suppressionslista]** Ny modell `EmailSuppression`: per-org blocklist med orsak (bounce_hard/complained/unsubscribed/manual)

## [0.3.1] - 2026-05-18

### Added
- **[BAS-seed expansion]** Utökar `src/lib/accounting/bas-seed.ts` från ~100 till 497 lövkonton (529 totalt inkl. grupper och klasser) i alla 8 kontokategorier (klass 1–8) — avskrivningskonton, EU-handel, personalförmåner, bokslutsdispositioner och skatter

## [0.3.0] - 2026-05-18

### Added
- **BAS 2026** — kontoplan expanderad från ~100 till ~300 konton (alla 8 kontokategorier)
- `POST /api/accounting/accounts/seed-bas` — importera/reimportera BAS-kontoplan i efterhand (idempotent)
- `GET /api/settings/account-mappings` — hämta kontomappningar (slot-overrides) per org
- `PUT /api/settings/account-mappings` — spara kontomappningar med kontonummervalidering
- `settings/accounting/account-mappings` — ny inställningssida med combobox-sökare per transaktionstyp
- "Kontomappningar" länk i sidomenyn under Bokföring
- "Importera BAS 2026"-knapp på kontoplansidan
- Tom kontoplan visar stor import-CTA istället för tom lista

## [0.2.1] - 2026-05-18

### Fixed
- **Översiktssidan** — mörkt läge: lade till `dark:` klasser på all text, kort och tabellrader
- **Översiktssidan** — visar nu användarens `fullName` istället för e-postprefixet
- **Översiktssidan** — använder nu org-slug för att slå upp korrekt org-ID (inte `session.activeOrganizationId` som pekade på byråns org vid impersonering)

## [0.2.0] - 2026-05-18

### Added
- **Plan-gating** — full plan-enforcement för free/starter/pro/enterprise-planer
- `src/lib/plans/limits.ts` — `PLAN_LIMITS`, `PLAN_LABELS`, `PLAN_PRICES`, feature-flaggar och hjälpfunktioner
- `src/lib/plans/guard.ts` — `PlanLimitError`, `getOrgPlan`, `enforceFeature`, `enforceLimit`, `requireFeature`, `getUsage`
- `src/lib/api/handle-error.ts` — central API-felhanterare, returnerar 401/402/403/500
- `GET /api/plans` — returnerar alla planer med priser, gränser och funktioner
- `GET /api/plans/current` — returnerar aktuell plan, gränser, användning och användningsprocent
- `src/components/ui/PlanGate.tsx` — klientkomponent för feature-gating i UI
- `src/components/ui/UpgradePrompt.tsx` — uppgradera-CTA med låsikon, inline- och blockvariant
- `src/components/ui/UsageBar.tsx` — återanvändbar förloppsindikator för plangränser
- Låsikon i sidomenyn för funktioner som kräver uppgradering (baserat på `orgPlan`)
- Funktionsmatris i fakturasidan (settings/billing) — visar vilka funktioner varje plan inkluderar

### Changed
- `POST /api/invoices` — kontrollerar `maxInvoicesPerMonth`-gräns vid skapande
- `POST /api/contacts` — kontrollerar `maxContacts`-gräns vid skapande
- `POST /api/products` — kontrollerar `maxProducts`-gräns vid skapande
- `POST /api/api-keys` — kontrollerar `api_access`-funktion och `maxApiKeys`-gräns
- `POST /api/ai/*` — alla AI-routes kräver `ai_assistant`-funktion
- `GET /api/sie/export` — kräver `sie_export`-funktion
- `withApiAuth` i `src/lib/api/auth.ts` — kontrollerar `api_access`-funktion för alla `/api/v1/*`-anrop
- `settings/billing` — uppdaterad fakturasida med funktionsmatris, nya `UsageBar`-komponenter och `/api/plans/current`
- Sidomenyn tar emot `orgPlan`-prop och visar låsikon på låsta navigationsposter

## [0.1.0] - 2026-05-18

### Added
- Initial versionshantering och changelog-system
- `src/lib/version.ts` med `APP_VERSION` och `getVersionInfo()`
- `GET /api/version` publik endpoint för versionsinfo (commit, branch, miljö)
- `GET /api/health` publik healthcheck-endpoint med databas- och tjänststatus
- `GET /api/changelog` publik endpoint som parsar och returnerar CHANGELOG.md som JSON
- `VersionBadge` i sidebar-footer med hover-tooltip och länk till `/version`
- `/version` UI-sida med changelog-historik och systeminformation
- `WhatsNewModal` — visas en gång per användare efter version-bump
- `VERSIONING.md` med dokumentation för versionsworkflow
- `CLAUDE.md` med obligatoriska regler för versionshantering vid varje uppgift
- `scripts/version-check.ts` — validerar synkning av version i package.json och version.ts
- `scripts/sync-version.ts` — synkar APP_VERSION och APP_VERSION_DATE automatiskt
- `scripts/extract-changelog.ts` — extraherar changelog-sektion för CI/release
- `.github/workflows/release.yml` — skapar GitHub Release automatiskt vid tagg
- `npm run version:bump:patch/minor/major` — automatiserad versionsbumpning
- Pre-commit hook via husky som kör `version:check`
- `SchemaVersion`-modell i Prisma för att tracka databasemigrationer
- `User.lastSeenVersion` fält för WhatsNewModal-detektering

### Database
- Added `SchemaVersion` model för att tracka Prisma-migrations
- Added `User.lastSeenVersion String?` för att spåra senast sedd version

[Unreleased]: https://github.com/Gregmoto/endoo/compare/v0.7.1...HEAD
[0.7.1]: https://github.com/Gregmoto/endoo/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/Gregmoto/endoo/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Gregmoto/endoo/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/Gregmoto/endoo/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Gregmoto/endoo/compare/v0.3.1...v0.5.0
[0.3.1]: https://github.com/Gregmoto/endoo/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Gregmoto/endoo/compare/v0.1.0...v0.3.0
[0.1.0]: https://github.com/Gregmoto/endoo/releases/tag/v0.1.0
