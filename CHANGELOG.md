# Changelog

Alla noterbara ändringar i Endoo dokumenteras här.

Formatet bygger på [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/)
och projektet följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Unreleased]

### Added
- (kommande ändringar listas här tills nästa release)

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

[Unreleased]: https://github.com/Gregmoto/endoo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Gregmoto/endoo/releases/tag/v0.1.0
