# Endoo — MVP Roadmap

## Principer

Bygg smalt men rätt. Varje fas levererar något körbart.
Skippa inget i grunden — fel arkitektur tidigt kostar 10x att rätta senare.

---

## Vad som är med i MVP vs inte

### I MVP (version 1.0)

| Modul | Motivering |
|---|---|
| Auth — login, session, JWT | Inget funkar utan det |
| Organisations-onboarding | Varje konto måste kunna skapas |
| RBAC — roller per konto | Multi-tenant utan roller är en säkerhetsrisk |
| Användarhantering — bjud in, hantera | Kunderna behöver kunna ha team |
| Byrå → kund-relation | Kärnan i affärsmodellen |
| Konto-växling | Utan det är byrå-funktionen värdelös |
| Kontakter — CRUD | Du kan inte fakturera luft |
| Fakturor — skapa, skicka, markera betald | Produktens kärnvärde |
| PDF-generering | En faktura utan PDF är inte en faktura |
| E-postleverans av faktura | Minsta acceptabla leveranskanal |
| Abonnemang — free + paid | Nödvändigt för att kunna ta betalt för SaaS:en |
| Audit logs — skrivs automatiskt | Säkerhetskrav, svårt att lägga till retroaktivt |
| Super admin — grundläggande | Behövs för att driftsätta och felsöka |

### Väntar till efter MVP

| Funktion | Varför den väntar |
|---|---|
| Återkommande fakturering | Komplex, bygger på stabilt faktura-core |
| Betalningslänkar (Stripe Checkout) | MVP klarar sig med manuell betalningsmarkering |
| Kreditnotor | Sällan kritiskt dag ett |
| Påminnelser + autobrev | Kräver e-postinfrastruktur mognare |
| Avancerade rapporter | Räcker med enkel lista i MVP |
| Produktkatalog | Manuella rader räcker till att börja med |
| White-label / branding per konto | Nice-to-have, inte day-one |
| Integrationer (Fortnox, Visma) | Fas 2 |
| Multivaluta | Stöd SEK/EUR initialt, fler sen |
| Detaljerad byråpersonals accessnivåer | Förenkla: full access för all byråpersonal i MVP |
| Mobil-app | Mobilanpassad webb räcker |

---

## MVP-faser

### Fas 0 — Grund (pågående)
**Mål:** Projektet ska vara körbart, säkert och rätt strukturerat från start.

- [x] Prisma-schema med alla tabeller
- [x] Neon DB ansluten och synkad
- [x] RBAC-system — permissions, roles, context, guards
- [x] Middleware — auth-gate + platform-admin-skydd
- [x] Konto-växling — JWT-logik, API-routes
- [x] `tenantDb()` — Prisma-wrapper som auto-isolerar per konto
- [ ] PostgreSQL RLS-policies mot Neon ← **måste lösas nu**
- [ ] `next.config.ts` + miljövariabelvalidering (zod)

**Teknisk risk att lösa:** RLS på Neon. Om det missas nu byggs
all ny kod utan det undre säkerhetslagret.

---

### Fas 1 — Auth + Konton
**Leverans:** En användare kan registrera sig, skapa ett konto och logga in.

**Vad byggs:**
- Registreringsflöde — skapa användare + organisation i samma transaktion
- Login — e-post + lösenord (magic link som option)
- Session + JWT med `activeOrganizationId`
- Onboarding-wizard — org-namn, typ (byrå/kund), valuta, land
- `/app/[orgSlug]` — dashboard-shell med OrgSwitcher
- `/login`, `/register`, `/invite/[token]`-sidor

**Definition of done:**
En ny användare kan registrera sig, få ett konto skapat och landa
på sin dashboard på `/app/[slug]`.

---

### Fas 2 — Användare + Roller
**Leverans:** Ett team kan jobba i samma konto med rätt behörigheter.

**Vad byggs:**
- Bjud in användare via e-post (Resend + invitation-token)
- Acceptera inbjudan → skapa membership
- Visa teammedlemmar + roller
- Byta roll, ta bort medlem
- Byrå skapar relation till kundkonto
- Konto-växling i UI (OrgSwitcher klar)

**Definition of done:**
En byråägare kan bjuda in en kollega, koppla ett kundkonto
och växla mellan dem.

---

### Fas 3 — Kontakter
**Leverans:** En kund kan registrera sina faktureringsmottagare.

**Vad byggs:**
- Lista, skapa, redigera, arkivera kontakter
- Sök + filtrering
- Kontaktinfo: namn, org-nummer, adress, e-post, betalningsvillkor
- Tenant-isolation via `tenantDb()`

**Definition of done:**
En kund kan hantera sin kontaktlista och alla kontakter
är strikt isolerade per konto.

---

### Fas 4 — Fakturor (core)
**Leverans:** Systemets kärnvärde — skapa och skicka en riktig faktura.

**Vad byggs:**
- Skapa faktura — välj kontakt, lägg till rader, sätt datum + villkor
- Fakturanummer-sekvens per org (`INV-001`, `INV-002`…)
- Statusflöde: `draft → sent → viewed → paid / overdue`
- Markera betald (manuell betalningsregistrering)
- PDF-generering server-side (`@react-pdf/renderer`)
- Skicka faktura via e-post (Resend) med PDF-bilaga
- Fakturalista med filter på status + sök

**Definition of done:**
En användare kan skapa en faktura, generera PDF,
skicka den via e-post och markera den som betald.

---

### Fas 5 — Abonnemang + Super Admin
**Leverans:** Endoo kan ta betalt för sig självt.

**Vad byggs:**
- Stripe-integration — planer (free, starter, pro)
- Checkout-flöde för uppgradering
- Webhook-hantering: subscription created/updated/cancelled
- Begränsa funktioner per plan (feature flags)
- Super admin: lista orgs, se detaljer, ändra plan, inaktivera konto
- Super admin: plattformslogg (alla `account_switch`, `impersonate_*`)

**Definition of done:**
En ny kund kan registrera sig på free-planen, uppgradera
via Stripe Checkout, och en super admin kan se alla konton.

---

### Fas 6 — Audit Log UI + Härdning
**Leverans:** Systemet är granskningsbart och redo för kunder.

**Vad byggs:**
- Audit log-vy per org (vem gjorde vad, när)
- Export av audit log (CSV)
- Rate limiting på API-routes
- CSRF-skydd
- Säkerhetshuvuden (`next.config.ts`)
- Felhantering + användarvänliga felmeddelanden
- Grundläggande e2e-tester (Playwright) på kritiska flöden

**Definition of done:**
En account owner kan se hela historiken för sitt konto.
Systemet klarar grundläggande säkerhetsgranskning.

---

## Byggordning per modul

```
RLS-policies          ← Fas 0, nu direkt
Auth + onboarding     ← Fas 1, unblocks allt annat
Invitations           ← Fas 2, unblocks team-arbete
Byrå-relationer       ← Fas 2, unblocks konto-växling
Kontakter             ← Fas 3, unblocks fakturor
Faktura-core          ← Fas 4, kärnvärdet
PDF + e-post          ← Fas 4, minimalt leveransbart
Stripe subscriptions  ← Fas 5, intäkter
Super admin           ← Fas 5, driftbarhet
Audit log UI          ← Fas 6, compliance + förtroende
```

---

## Tekniska risker — lös tidigt

### 1. PostgreSQL RLS (kritisk)
**Risk:** All kod skrivs utan det undre säkerhetslagret. En bugg i
applikationslagret kan läcka data mellan konton.
**Åtgärd:** Sätt upp RLS på Neon innan Fas 1 börjar.
```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```
Och i Prisma-klienten, sätt `app.current_organization_id` via `$executeRaw`
i början av varje request.

### 2. PDF-generering är tung
**Risk:** `@react-pdf/renderer` är CPU-intensiv. I serverless (Vercel)
kan cold starts + PDF-generering överstiga 10s timeout.
**Åtgärd:** Kör PDF-generering som ett bakgrundsjobb (Trigger.dev)
direkt från Fas 4. Spara PDF till Cloudflare R2/Vercel Blob, returnera URL.
Generera aldrig PDF synkront i en API-route.

### 3. Fakturanummer-kollision
**Risk:** Två parallella requests kan skapa `INV-001` och `INV-001`
om sekvensen hanteras i applagret.
**Åtgärd:** Använd en PostgreSQL-sekvens per org, eller en advisory lock.
```sql
SELECT nextval('org_' || replace($1::text, '-', '_') || '_invoice_seq');
```
Alternativt: en `invoice_sequences`-tabell med `FOR UPDATE SKIP LOCKED`.

### 4. JWT-storlek
**Risk:** JWT med org-lista för en byrå med 50 kunder kan bli för stor
för cookie (4KB-gräns).
**Åtgärd:** JWT innehåller bara `activeOrganizationId` (inte hela listan).
Org-listan hämtas alltid från DB via `/api/orgs/mine`. Aldrig i JWT.

### 5. Stripe webhook-idempotens
**Risk:** Stripe kan leverera samma webhook två gånger.
**Åtgärd:** Spara `stripe_event_id` i DB och kontrollera dubletter
innan subscription-state uppdateras. Implementeras i Fas 5.

---

## Vad som aldrig ska kompromissas

Oavsett tidspress — dessa fyra saker är alltid med:

1. **`organizationId` på varje tenant-rad** — aldrig ett undantag
2. **Audit log skrivs för alla mutationer** — inget "lägger vi till sen"
3. **`tenantDb()` används alltid** — direkt Prisma-klient bara för global data
4. **Soft delete (`deletedAt`)** — aldrig `DELETE FROM` på affärsdata
