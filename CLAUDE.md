# Endoo — Claude Code instruktioner

Dessa regler gäller för alla uppgifter i detta repo. Läs dem innan du börjar.

---

## VERSIONSHANTERING (OBLIGATORISKT VID VARJE UPPGIFT)

Varje uppgift som ändrar kod i `src/` MÅSTE avslutas med följande steg:

### 1. Bestäm bump-typ

| Ändring | Bump |
|---------|------|
| Bugg, text, CSS-polish | `patch` |
| Ny sida, ny route, ny feature | `minor` |
| Borttagen route, breaking schema | `major` |

### 2. Kör versionsbumpen

```bash
npm run version:bump:patch   # patch
npm run version:bump:minor   # minor
npm run version:bump:major   # major
```

Detta uppdaterar `package.json` **och** `src/lib/version.ts` automatiskt.

### 3. Skriv changelog-post under `[Unreleased]` i `CHANGELOG.md`

```markdown
### Added
- **[Uppgift X.Y]** Kort, specifik beskrivning av tillagd feature

### Changed
- **[Uppgift X.Y]** Vad ändrades och varför

### Fixed
- **[Uppgift X.Y]** Vilken bugg och hur den fixades

### Database
- **[Uppgift X.Y]** Migration `YYYYMMDD_NNN_namn`: vad den gör

### Security
- **[Uppgift X.Y]** Beskrivning av säkerhetsändringen
```

### 4. Regler för changelog-poster

- Inkludera **alltid** uppgifts-ID i fetstil (`**[Uppgift 1.2]**`)
- Var specifik — skriv aldrig bara "diverse förbättringar"
- Skriv på svenska
- En rad per förändring
- Använd rätt kategori (se VERSIONING.md)

### 5. Vid fasavslut (alla uppgifter i Fas N klara)

Flytta `[Unreleased]`-poster till en ny version-post och tagga release:

```bash
# Redigera CHANGELOG.md: flytta [Unreleased] → [0.2.0] - YYYY-MM-DD
npm run version:bump:minor
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

### 6. Validering

```bash
npm run version:check   # körs automatiskt av pre-commit hook
```

Blockerar commit om `package.json` och `src/lib/version.ts` är ur synk.

---

## KOD-REGLER

- Skriv inga kommentarer om inte WHY är icke-uppenbar
- Inga multi-paragraph docstrings
- Standardbibliotek och Next.js-konventioner framför egna abstraktioner
- Validera bara vid systembränder (user input, externa API:er)
- Föredra att redigera befintliga filer framför att skapa nya

## SÄKERHET

- Alla tenant-scoped Prisma-queries MÅSTE filtrera på `organizationId`
- Använd `requirePermission()` i alla route handlers
- Portal-routes: använd `requirePortalAuth(orgSlug)`
- Kryptera aldrig känsliga fält direkt i kod — använd `lib/crypto.ts`

### Regler för nya tenant-scoped routes (OBLIGATORISKT)

1. **404 — inte 403** för resurser som tillhör annan org (läcker inte existens)

2. **Prisma-frågor** — alltid `organizationId: ctx.organizationId` i `where`:
   ```ts
   prisma.contact.findFirst({ where: { id, organizationId: ctx.organizationId } })
   ```

3. **Lägg till ett test** i `tests/security/tenant-isolation.test.ts`:
   - Konfigurera Prisma-mock som oracle (returnerar resurs utan org-filter)
   - Anropa routen med Org A-session och Org B:s ID
   - Förvänta 404 och kör `assertNoLeak(res, FORBIDDEN_STRINGS)`

4. **Kör audit** efter implementation:
   ```bash
   npm run audit:prisma:strict    # måste ge 0 suspects
   npm run scan-routes            # uppdaterar route-manifestet
   npm run test:security          # kör isoleringstesterna
   ```

5. **Kör inte** `audit:prisma:strict` om du lägger till ett `// audit-ok`-undantag
   utan att ha förklarat varför i en kommentar på raden ovanför.

Se [SECURITY.md](SECURITY.md) för full dokumentation av isoleringsmodellen.

## COMMITS

- Committa aldrig utan att tsc --noEmit ger 0 fel
- Kör `npm run build` vid tveksamhet
- Skriv konventionella commits: `feat:`, `fix:`, `chore:`, `docs:`
