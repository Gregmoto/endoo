# Security

## Rapportera en säkerhetsbrist

Rapportera **inte** säkerhetsproblem som publika GitHub-issues.

Skicka istället ett e-postmeddelande till **info@gregmoto.se** med:
- Beskrivning av bristen
- Reproduktionssteg
- Påverkad version

Vi bekräftar mottagandet inom 48 timmar och håller dig uppdaterad om åtgärdsarbetet.

---

## Tenant-isolering

Endoo är en multi-tenant SaaS-plattform. **Strikt tenant-isolering** är det viktigaste säkerhetskravet.

### Hur isolering enforces

1. **Session → organizationId**
   `requireAuth()` löser användarens aktiva org-ID från NextAuth-sessionen och
   returnerar ett `RBACContext` med `organizationId`. All dataåtkomst sker via
   detta ID.

2. **Prisma WHERE-klausal**
   Varje Prisma-fråga på tenant-scopade modeller MÅSTE inkludera
   `organizationId: ctx.organizationId`. Exempel:
   ```ts
   prisma.invoice.findFirst({
     where: { id, organizationId: ctx.organizationId, deletedAt: null },
   })
   ```
   Hittas inget → `null` → routern returnerar 404.

3. **404 i stället för 403**
   En resurs som inte tillhör den anropande org:en returnerar alltid 404
   (inte 403). Det läcker inte existensinformation.

4. **Portal-sessioner**
   Kundportalens JWT (`portal_session`-cookie) innehåller `orgId`.
   `requirePortalAuth(orgSlug)` verifierar att org-slug i URL:en matchar JWT:ets
   `orgId`. Mismatch → 401.

5. **API-nycklar (v1)**
   API-nyckelns `organizationId` (från databasen) injiceras som `ctx` i
   `withApiAuth`. Nyckeln ger aldrig åtkomst till annan org.

6. **Impersonering**
   Under impersonering pekar `ctx.organizationId` på klient-org:en, inte
   byråns org. `requireAuth()` löser den aktiva kontexten korrekt från
   sessionen varje request.

### Whitelistade modeller (ingen org-filter krävs)

| Modell | Anledning |
|--------|-----------|
| `Organization` | Entiteten i sig, plattformsnivå |
| `User` | Global, hanteras av plattform |
| `OrganizationMember` | Innehåller både orgId och userId |
| `SchemaVersion` | Migrationsschema |
| `AgencyStaffAccess` | Plattformsbehörighet |
| `Subscription` | Stripe-länkad, plattformsnivå |
| `Invitation` | Skapas utan session, valideras med token |
| `PortalMagicToken` | Söks upp per token, orgId inbäddas i JWT |

---

## Automatiserade tester

### 1. Tenant-isolation-testsuite (`tests/security/tenant-isolation.test.ts`)

Testar att varje route returnerar 404 (eller tomt svar) när en Org A-session
försöker komma åt Org B:s data.

**Strategi:**
- `requireAuth()` mockas att returnera Org A:s kontext
- Prisma-mock konfigureras som "oracle" — returnerar Org B:s data ENBART om
  `organizationId`-filter saknas
- Om en route läcker data misslyckas testet

**Kör:**
```bash
npm run test:security
```

**Täcker:**
- Contacts CRUD (list, detail, update, delete)
- Invoices (list, detail, betalning, PDF)
- Products CRUD
- Quotes CRUD
- Journals
- Aggregerade rapporter
- Portal-token misuse (org A token mot org B slug)
- Impersoneringsavstängning
- v1 API-nyckelkontext
- Fulltextsökning cross-leak

### 2. Prisma-query-audit (`scripts/audit-prisma.ts`)

Statisk analys som skannar all `src/**/*.ts`-kod och flaggar Prisma-anrop på
tenant-scopade modeller utan `organizationId` i where-klausulen.

```bash
npm run audit:prisma          # rapport + utdata
npm run audit:prisma:strict   # avsluta med kod 1 om suspects finns (CI)
```

Rapporten sparas i `tests/_audit-prisma-report.json`.

Åsidosätt ett känt säkert anrop med kommentaren `// audit-ok` på samma rad:
```ts
prisma.contact.findMany({ where: { email } }) // audit-ok — email-suppression check
```

### 3. Route-manifest (`scripts/scan-routes.ts`)

Skannar `src/app/api/` och skriver `tests/_route-manifest.json` med alla
routes kategoriserade som `tenant | platform | portal | v1 | public | cron`.

```bash
npm run scan-routes
```

---

## CI-integration

Filen `.github/workflows/security.yml` definierar tre jobb som **blockerar
merge** vid fel:

| Jobb | Vad det testar |
|------|---------------|
| `tenant-isolation` | Kör `tests/security/tenant-isolation.test.ts` |
| `audit-prisma` | Kör `audit-prisma.ts --strict` — 0 suspects kräves |
| `type-check` | `tsc --noEmit` — inga TypeScript-fel |

---

## Audit-rapport (plattformsgränssnitt)

Super-admins kan se senaste körningsresultat på:
```
/platform/security/audit-report
```

Sidan visar:
- Totalt antal routes och deras kategorier
- Prisma-suspects (om några)
- Fullständigt route-manifest med auth-status

Kräver rollen `super_admin` och behörigheten `platform:security:read`.

---

## Regler för nya routes

1. Varje ny tenant-scoped route MÅSTE:
   - Kalla `requireAuth()` och använda `ctx.organizationId` i alla Prisma-frågor
   - Returnera 404 (inte 403) för resurser som inte tillhör org:en
   - Ingå i `tests/security/tenant-isolation.test.ts`

2. `npm run audit:prisma:strict` måste passera utan nya suspects.

3. Kör `npm run scan-routes` för att uppdatera manifestet vid ny route.

Se även: [CLAUDE.md](CLAUDE.md) → Säkerhetsregler för routes.
