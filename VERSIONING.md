# Versionshantering i Endoo

## Princip

Endoo följer [Semantic Versioning 2.0](https://semver.org/lang/sv/) — `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking changes i API eller datamodell (icke-bakåtkompatibel migration)
- **MINOR** — ny funktion, bakåtkompatibel (ny modell, ny route, ny UI-sida)
- **PATCH** — buggfixar, UI-polish, textändringar utan nya features

Startversion: `0.1.0` (pre-1.0 = under aktiv utveckling).
`1.0.0` reserveras för första publika lansering.

Pre-release-suffix tillåtna: `0.5.0-beta.1`, `0.5.0-rc.2`

---

## Versionstabell

| Ändringstyp | Bump |
|-------------|------|
| Bugg eller textfix | PATCH (`0.1.0 → 0.1.1`) |
| Ny endpoint / sida / feature (bakåtkompatibel) | MINOR (`0.1.x → 0.2.0`) |
| Borttagen endpoint eller breaking schema | MAJOR (`0.x.x → 1.0.0`) |
| Intern refaktor utan beteendeändring | PATCH |
| Nytt Prisma-fält (nullable, med default) | PATCH |
| Ny Prisma-modell | MINOR |
| Borttaget fält eller modell | MAJOR |

---

## Workflow vid varje commit

1. **Bestäm bump-typ** utifrån tabellen ovan
2. **Kör versionsbumpen:**
   ```bash
   npm run version:bump:patch   # buggfix / polish
   npm run version:bump:minor   # ny feature
   npm run version:bump:major   # breaking change
   ```
3. **Lägg post under `[Unreleased]`** i `CHANGELOG.md` i rätt kategori
4. **Inkludera uppgifts-ID i fetstil** för spårbarhet: `**[Uppgift 1.2]**`
5. **Kör `npm run version:check`** (pre-commit hook gör det automatiskt)

---

## Kategorier i CHANGELOG.md

| Kategori | Användning |
|----------|------------|
| `Added` | Nya funktioner |
| `Changed` | Ändringar i befintlig funktionalitet |
| `Deprecated` | Funktioner som ska tas bort |
| `Removed` | Borttagna funktioner |
| `Fixed` | Buggfixar |
| `Security` | Säkerhetsrelaterade ändringar |
| `Database` | Schema-ändringar (custom — kritiskt för bokföringssystem) |
| `Breaking` | Breaking changes (kompletterar MAJOR-bump) |

---

## Release-process

1. Alla uppgifter i en fas är klara
2. Flytta `[Unreleased]`-poster till ny version-post i `CHANGELOG.md`
3. Kör `npm run version:bump:minor` (eller major)
4. Commita: `git commit -m "chore: release v0.2.0"`
5. Tagga: `git tag v0.2.0`
6. Pusha: `git push && git push --tags`
7. GitHub Actions skapar automatiskt en Release med changelog-innehållet

---

## Filer som berörs

| Fil | Innehåll |
|-----|----------|
| `package.json` | `"version"` — source of truth för npm |
| `src/lib/version.ts` | `APP_VERSION`, `APP_VERSION_DATE` — synkas av `sync-version.ts` |
| `CHANGELOG.md` | Historik i Keep a Changelog-format |
| `scripts/version-check.ts` | Validerar synkning — körs av pre-commit hook |
| `scripts/sync-version.ts` | Uppdaterar `version.ts` efter `npm version` |

---

## Automatisering

- **Pre-commit hook** (`husky`) kör `version:check` — blockerar inkonsekvent state
- **`npm run version:bump:*`** kör `npm version` + `sync-version.ts` i en operation
- **Vercel** exponerar `VERCEL_GIT_COMMIT_SHA` och `VERCEL_GIT_COMMIT_REF` i runtime
- **`/api/version`** returnerar live versionsinfo för support och monitoring
- **`/api/health`** returnerar tjänststatus — används av synthetic monitoring
