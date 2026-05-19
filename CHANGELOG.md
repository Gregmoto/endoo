# Changelog

Alla noterbara ändringar i Endoo dokumenteras här.

Formatet bygger på [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/)
och projektet följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Unreleased]

## [0.26.0] - 2026-05-19

### Changed
- **[M1]** Komplett ombyggd navigation — bort med vänster-sidebar, in med modern topp-bar med kategorier och horisontell sub-meny
- **[M1]** Huvudkategorier synliga direkt i top-bar (inte gömda bakom Meny-knapp); overflow-kategorier döljs i "Mer ▾" dropdown med ResizeObserver
- **[M1]** Sub-meny visas automatiskt för kategorier som behöver det (Bokföring, Fakturering, Register, Byrå), gömd för kategorier med bara en sida
- **[M1]** Org-väljare och räkenskapsår flyttade till top-bar (höger sida, desktop)
- **[M1]** Tema-toggle flyttad till avatar-dropdown
- **[M1]** ImpersonationBanner integrerad i sticky header-stack (ej längre fixed-positionerad separat)
- **[M1]** Layout-bakgrund ändrad från hårdkodad `bg-gray-50` till semantisk `bg-background`

### Added
- **[M1]** Avatar-dropdown med användarinfo, Inställningar, Team, Audit log, Tema-väljare (inline sub-meny) och Logga ut
- **[M1]** Räkenskapsår-väljare med localStorage-persistens per org (`endoo:fiscal-year:{orgId}`)
- **[M1]** Mobil-anpassad hamburger-meny med slide-over (250ms animate-drawer-in); kategorier med expanderbara sub-menyer, org/år-väljare, tema-toggle och Logga ut
- **[M1]** Single source of truth för navigation i `src/lib/navigation/config.ts` (NavCategory + NavSubItem typer)
- **[M1]** `useActiveCategory(orgSlug)` hook — matchar pathname mot matchPaths, returnerar aktiv kategori och sub-item
- **[M1]** `useFiscalYear(orgId)` hook med localStorage-persistens
- **[M1]** Skip-link "Hoppa till innehåll" för tillgänglighet (`sr-only focus:not-sr-only`)
- **[M1]** Cmd+K-hint i top-bar (desktop) som öppnar befintlig CommandPalette

### Removed
- **[M1]** Vänster-sidebar (`Sidebar`-komponent ersatt av TopBar)
- **[M1]** Mobil bottom-navigation bar (`MobileNavBar` ersatt av hamburger i top-bar)

## [0.25.0] - 2026-05-19

### Added
- **[F3b]** Live PDF-förhandsvisning på `/settings/invoicing/template` — tvåkolumnslayout med formulär till vänster och klistrad PDF-förhandsgranskning till höger
- **[F3b]** `<TemplateEditor />` — lastar och sparar InvoiceTemplate2 via REST, visar toast-notifikation vid sparning
- **[F3b]** `<TemplateForm />` — 7 hopfällbara sektioner: Logotyp, Adress & Kontakt, Bankuppgifter, Swish, Företagsuppgifter, Text & Meddelanden, Mallinställningar
- **[F3b]** `<TemplatePreview />` — realtidsförhandsgranskning med `PDFViewer` (@react-pdf/renderer), Swish QR genereras klientsidan via `qrcode`
- **[F3b]** Zoomkontroller (50–150%) med persistent localStorage-inställning
- **[F3b]** Exempeltyp-väljare: Faktura, Kreditnota, Proformafaktura, Räntefaktura, Påminnelse
- **[F3b]** Nedladdningsknapp genererar PDF direkt i webbläsaren utan API-anrop
- **[F3b]** `buildSampleInvoice()` i `src/lib/pdf/sample-data.ts` — realistisk exempelfaktura för förhandsgranskning

## [0.24.0] - 2026-05-19

### Changed
- **[F3a]** PDF-fakturamallen byggd om från grunden — följer svensk fakturastandard med modern typografi (Boove/Fortnox-inspirerad layout)
- **[F3a]** Tomma fält visas inte längre i PDF — godsmärke, frakt, öresutjämning m.fl. utelämnas automatiskt om de är noll/null
- **[F3a]** All sidfots-data (bankgiro, IBAN, BIC, adress, telefon, e-post, web) hämtas nu från InvoiceTemplate

### Added
- **[F3a]** Nio separata PDF-subkomponenter under `src/lib/pdf/templates/invoice/`: Header, Addresses, Metadata, LineItemsTable, InfoBox, InterestNotice, Summary, SwishQr, PageFooter
- **[F3a]** Multi-page support med upprepad sidfot (4 kolumner) på varje sida
- **[F3a]** Info-box centrerad i PDF renderas om `template.footerText` är satt
- **[F3a]** Swish QR-kod genereras automatiskt med `qrcode`-biblioteket (om showSwishQr + swishNumber satt)
- **[F3a]** Dröjsmålsränta-notis renderas om `interestRatePercent > 0` i org-inställningar
- **[F3a]** InvoiceTemplate2 utökad med fält: `swishNumber`, `logoUrl`, `email`, `website`, `boardSeat`, `fax`

### Database
- **[F3a]** Migration `20260519_001_invoice_template_fields`: lägger till 6 kolumner på `invoice_templates`

## [0.23.0] - 2026-05-19

### Added
- **[F4]** Ny `<InvoiceFormLineItems />` komponent med 13-kolumners Fortnox-liknande fakturatabelll: artikelnr, benämning, lagerställe, best.antal, lev.antal, enhet, à-pris, rabatt (% eller kr), summa, moms, konto, TG%, åtgärder
- **[F4]** Ny `<InvoiceFormLineRow />` komponent med typeahead-sökning för artiklar (`/api/articles`) och bokföringskonton (`/api/accounting/accounts`), automatisk TG%-beräkning med färgkodning
- **[F4]** Faktura ny-sida (`invoices/new`) använder nu nya radkomponenterna och skickar korrekt `unitPriceOre` (öre), `orderedQuantity`, `deliveredQuantity`, `accountNumber`, `vatType`, `warehouseLocation`, `purchasePrice` till API

### Fixed
- **[F4]** Befintlig bugg: faktura ny-sida skickade `unitPriceKr` men API förväntar `unitPriceOre` — rader hamnade alltid på 0 kr

## [0.22.2] - 2026-05-19

### Fixed
- **[F2]** Valuta visas nu som dropdown överallt (inte fritext) — hämtas konsekvent från Currency-modellen via `/api/settings/currencies?active=true`
- **[F2]** Standardvaluta läses automatiskt från Organization currencies (isDefault) via `useCurrencies()`-hook
- **[F2]** Ny återanvändbar `<CurrencySelect />` komponent i `src/components/ui/CurrencySelect.tsx`
- **[F2]** Ny `useCurrencies()` hook i `src/lib/hooks/use-currencies.ts`
- **[F2]** Uppdaterat `GET /api/settings/currencies?active=true` — returnerar bara aktiva valutor
- **[F2]** Valuta-dropdown uppdaterad i: faktura ny, offert ny, återkommande avtal (steg 4 Detaljer), kundformulär, fakturainställningar, prislisteinställningar, allmänna faktureringsinställningar

## [0.22.1] - 2026-05-19

### Changed
- **[F1]** Default-tema ändrat från "system" till "light" — användare utan sparat val ser ljust läge oavsett OS-inställning

## [0.22.0] - 2026-05-19

### Added
- **[Uppgift 1.8b]** Ny artikel-sida (`/[orgSlug]/articles/new/page.tsx`): wraps ArticleForm i "new"-läge
- **[Uppgift 1.8b]** Redigera artikel-sida (`/[orgSlug]/articles/[id]/edit/page.tsx`): hämtar artikel och mappar fält till ArticleFormData
- **[Uppgift 1.8b]** Artikeldetaljsida (`/[orgSlug]/articles/[id]/page.tsx`): 6 flikar (Allmän/Pris/Bokföring/Lagerdetaljer/Inköp/Historik) med lazy-laddad historik, aktivera/inaktivera-knapp och mjuk-borttagning
- **[Uppgift 1.8b]** Etikettutskrift (`/[orgSlug]/articles/labels/print/page.tsx`): Avery-formatval (3474/3481/custom), streckkodtyp (Code128/EAN-13), kopior per artikel, print-CSS-layout
- **[Uppgift 1.8b]** `POST /api/articles/[id]/activate`: aktiverar artikel och rensar isPhasingOut
- **[Uppgift 1.8b]** `POST /api/articles/[id]/archive`: sätter isActive=false
- **[Uppgift 1.8b]** `GET /api/articles/[id]/history`: hämtar lagertransaktioner (max 100) och auditlogg (max 50)
- **[Uppgift 1.8b]** `POST /api/articles/[id]/inventory-count`: skapar count_set-transaktion och uppdaterar stockQuantity/availableQuantity
- **[Uppgift 1.8b]** `GET/POST /api/articles/[id]/reservations`: listar och skapar manuella reserveringar
- **[Uppgift 1.8b]** `DELETE /api/articles/[id]/reserve`: avbokar manuell reservering via reservationId i body
- **[Uppgift 1.8b]** `GET/POST /api/articles/[id]/price-lists`: listar och upsert:ar prislisteposter för artikel
- **[Uppgift 1.8b]** `PUT/DELETE /api/articles/[id]/price-lists/[plId]`: uppdaterar och tar bort specifik prislistepost
- **[Uppgift 1.8b]** `GET /api/articles/[id]/label`: genererar streckkodsbild (Code 128 / EAN-13) via bwip-js som PNG

## [0.21.0] - 2026-05-19

### Added
- **[Uppgift 1.8b]** `GET /api/articles`: artikellista med sökning, flikfilter (all/stock/service/phasing/inactive), paginering, sortering och distinct-tillverkarfilter
- **[Uppgift 1.8b]** `POST /api/articles`: skapa artikel med auto-genererat artikelnummer, InventoryItem-skapande för lagervaror och auditlogg
- **[Uppgift 1.8b]** `GET /api/articles/[id]`: hämtar enskild artikel med inventoryItem, priceListItems och manualReservations
- **[Uppgift 1.8b]** `PUT /api/articles/[id]`: uppdatera artikel med duplikatskydd på SKU
- **[Uppgift 1.8b]** `DELETE /api/articles/[id]`: mjuk-borttagning av artikel
- **[Uppgift 1.8b]** `POST /api/articles/bulk-update`: massuppdatering med 10 operationer (prisjustering, momsmappning, aktivera/inaktivera m.fl.) i Prisma-transaktion
- **[Uppgift 1.8b]** `POST /api/articles/export`: CSV-export (UTF-8 BOM, semikolon) med alla artikelfält; returnerar 501 för xlsx/pdf
- **[Uppgift 1.8b]** `POST /api/articles/search-ean`: slå upp artikel via EAN-streckkod
- **[Uppgift 1.8b]** Artikellistesida (`/[orgSlug]/articles/page.tsx`): tabbar med räknare, sorterbar tabell, debouncat sök, EAN-auto-redirect, bulk-åtgärder, per-rad meny, TG%-färgkodning, mobil kortlayout och localStorage-sidstorlek
- **[Uppgift 1.8b]** Artikelimport-wizard (`/[orgSlug]/articles/import/page.tsx`): 5-stegswizard med CSV-parser (; , tab), kolumnmappning, förhandsvisning, import med duplikatstrategi (hoppa/uppdatera) och resultatsammanfattning
- **[Uppgift 1.8b]** Kontomappningar-sida (`/[orgSlug]/settings/invoicing/account-mappings/page.tsx`): redigera BAS-kontering per slot, återställ-knapp och sparning via PUT /api/settings/account-mappings

### Changed
- **[Uppgift 1.8b]** `/[orgSlug]/products/page.tsx` omdirigeras nu med `router.replace()` till `/articles` (bakåtkompatibel redirect)

## [0.20.0] - 2026-05-19

### Added
- **[Uppgift 1.8b]** `src/lib/articles/article-number.ts`: `generateArticleNumber()` med stöd för numeric/alphanumeric/random-format och serializable transaktion, samt `isArticleNumberTaken()`
- **[Uppgift 1.8b]** `src/lib/articles/ean-validator.ts`: `validateEan13()`, `generateEan13Check()` och `formatEan()` för EAN-13-validering med checksumkontroll
- **[Uppgift 1.8b]** `src/lib/inventory/reservations.ts`: `calculateReservedQuantity()`, `refreshProductReservations()` och `refreshAllReservations()` för lagerreserveringslogik
- **[Uppgift 1.8b]** `src/lib/inventory/cost-calculation.ts`: `calculateNewAverageCost()`, `updateProductAverageCost()`, `calculateMargin()` och `calculateMarginAmount()` för rörligt genomsnittspris och marginalberäkningar
- **[Uppgift 1.8b]** `src/lib/inventory/availability.ts`: `getAvailableQuantity()`, `canFulfillOrder()` och `getStockHistory()` för lagertillgänglighet
- **[Uppgift 1.8b]** `src/lib/inventory/stock-cache.ts`: `refreshProductStockCache()` och `refreshAllStockCache()` för att synkronisera lagercachen från transaktionsregistret
- **[Uppgift 1.8b]** `src/lib/accounts/account-mapping.ts`: BAS-standardkonton, `getSalesAccount()`, `getAccountMapping()` och `getOrCreateDefaultMappings()` med företrädesordning kontakt > produkt > DB > BAS > 3001
- **[Uppgift 1.8b]** `GET /api/cron/refresh-inventory-cache`: kronrutin som uppdaterar lager- och reserveringscache för alla organisationer, skyddad med `CRON_SECRET`
- **[Uppgift 1.8b]** `GET /api/settings/account-mappings/bas`: listar alla momstypsmappningar (DB-värden sammanslagna med BAS-standardvärden)
- **[Uppgift 1.8b]** `POST /api/settings/account-mappings/bas/reset`: återställer alla momstypsmappningar till BAS-standardkonton
- **[Uppgift 1.8b]** `PUT /api/settings/account-mappings/bas/[vatType]`: upsert av enskild momstypsmappning

## [0.19.0] - 2026-05-19

### Added
- **[Uppgift 1.8]** Kundlista (`/customers/page.tsx`): sökbar, filterbar (land, status), sorterbar tabell med per-rad åtgärdsmeny, bulk-åtgärder (arkivera/aktivera/exportera), paginering med localStorage-storlek, och mobil kortlayout
- **[Uppgift 1.8]** `CustomerForm` (`src/components/customers/CustomerForm.tsx`): flikformulär med 8 flikar (Allmän info, Leverans & Besök, Anteckningar, Fakturadata, Referenser, Bokföring, E-post, Fakturatext), autospar-utkast, kundtyp-radio (Företag/Privat), landsdropdown från COUNTRIES, betalningsvillkor-dropdown, VIES-verifiering, multi-chip e-post
- **[Uppgift 1.8]** Ny kund-sida (`/customers/new/page.tsx`): wraps CustomerForm i "new"-läge
- **[Uppgift 1.8]** Import-wizard (`/customers/import/page.tsx`): 5-stegs guide för CSV-import med automatisk kolumnmatchning, förhandsvisning och resultatsammanfattning
- **[Uppgift 1.8a]** Kunddetaljsida `/(dashboard)/[orgSlug]/customers/[id]/page.tsx` med header, statistik och 10 flikar: Allmän information, Leverans & Besök, Anteckningar (inline-redigering), Fakturadata, Referenser, Bokföring (VIES-verifiering), E-post, Fakturatext, Transaktioner (paginerad tabell med filtrering), Aktivitet (tidslinje)
- **[Uppgift 1.8a]** Kundredigeringssida `/(dashboard)/[orgSlug]/customers/[id]/edit/page.tsx` som laddar CustomerForm i edit-läge med mappade initialData
- **[Uppgift 1.8a]** `GET /api/customers/[id]` — kunddetalj med relationer (accountManager, priceList, deliveryMethod, deliveryTerms, contactPersons)
- **[Uppgift 1.8a]** `PUT /api/customers/[id]` — uppdatera internalNotes/notes
- **[Uppgift 1.8a]** `GET /api/customers/[id]/transactions` — paginerad fakturalista med sammanfattningsstatistik (totalbelopp, obetalt, snittbetalningstid)
- **[Uppgift 1.8a]** `GET /api/customers/[id]/activity` — aktivitetstidslinje baserad på audit-loggar

## [0.17.0] - 2026-05-19

### Added
- **[Uppgift 1.7c]** Betalningsmodul: ny `/payments/page.tsx` med daggruppad lista, manuellt registreringsformulär med faktura-autokomplettering, borttagning av enskilda betalningar och bulk-radering
- **[Uppgift 1.7c]** `GET/POST /api/payments` — paginerad lista med daggrupperingar + registrering av betalning med automatisk uppdatering av `Invoice.paidAmount`/`status`/`paidAt`
- **[Uppgift 1.7c]** `GET/DELETE /api/payments/unmatched` — lista och bulk-avskriv omatchade betalningar
- **[Uppgift 1.7c]** `DELETE /api/payments/[id]` — ta bort betalning och reversera fakturastatus
- **[Uppgift 1.7c]** Påminnelsemodul: ny `/reminders/page.tsx` med statistikblock (obetalda/förfallna), dubbla flikar, påminnelsemodal med avgiftsväxel
- **[Uppgift 1.7c]** `GET /api/reminders/stats` — räknar obetalda och förfallna fakturor med totalbelopp
- **[Uppgift 1.7c]** `GET /api/reminders/invoices` — paginerad fakturalista med tab, sökning, `overdueMinDays`-filter och `daysOverdue`-beräkning
- **[Uppgift 1.7c]** `POST /api/invoices/[id]/send-reminder` — skickar påminnelse, skapar valfri påminnelseavgift (60 kr), räknar upp `reminderCount`
- **[Uppgift 1.7c]** `POST /api/invoices/bulk/send-reminders` — bulk-påminnelse till upp till 250 förfallna fakturor
- **[Uppgift 1.7c]** Avtalsfaktureringsmodul: lista (`/recurring`), guideformulär (`/recurring/new`), detaljvy (`/recurring/[id]`) med flikar för info/rader/fakturor/schema
- **[Uppgift 1.7c]** `GET/POST /api/recurring` — CRUD-lista med status-räkningar per flik
- **[Uppgift 1.7c]** `GET/PUT/DELETE /api/recurring/[id]` — hämta, uppdatera, mjukt ta bort avtal
- **[Uppgift 1.7c]** `POST /api/recurring/[id]/activate|pause|resume|end` — livscykelhantering av avtal
- **[Uppgift 1.7c]** `POST /api/recurring/[id]/generate-now` — skapa faktura manuellt för aktivt avtal
- **[Uppgift 1.7c]** `GET /api/recurring/[id]/preview-schedule` — förhandsgranska kommande fakturadatum
- **[Uppgift 1.7c]** `GET/POST /api/cron/contracts` — idempotent cron-rutin som genererar fakturor för alla aktiva avtal vars `nextIssueDate` är idag eller tidigare
- **[Uppgift 1.7c]** `src/lib/invoicing/recurring/schedule.ts` — `calculateNextIssueDate` (hanterar månadsskifte, skottår, kvartal, halvår) + `generatePreviewSchedule`
- **[Uppgift 1.7c]** `src/lib/banking/bgmax/parser.ts` — BGMax-parser med stöd för alla posttyper (01, 05, 20/21, 22, 25, 26/27, 30/31, 90)
- **[Uppgift 1.7c]** `src/lib/banking/camt/parser.ts` — camt.054-parser (ISO 20022 XML) utan extern XML-lib
- **[Uppgift 1.7c]** `src/lib/banking/csv/parser.ts` — CSV-parser med stöd för `,`/`;`/tab-separatorer, svenska talformat, DD/MM/YYYY
- **[Uppgift 1.7c]** 69 enhetstester för banking-parsers och schemaläggningslogik (bgmax/camt/csv + recurring schedule)
- **[Uppgift 1.7c]** Nya RBAC-behörigheter: `PAYMENT_PERMISSIONS`, `REMINDER_PERMISSIONS`, `RECURRING_PERMISSIONS` (12 nya behörigheter totalt)
- **[Uppgift 1.7c]** Nya planfunktioner: `payment_file_import` (Starter+), `auto_reminders` (Pro+), `recurring_invoicing` (Starter+)

### Changed
- **[Uppgift 1.7c]** Sidofält: lade till Påminnelser, Avtalsfakturering under Fakturering-gruppen
- **[Uppgift 1.7c]** `src/lib/rbac/roles.ts`: alla 8 roller uppdaterade med betalnings-, påminnelse- och avtalsbehörigheter
- **[Uppgift 1.7c]** `RecurringSchedule`-modell utökad med 12 nya fält (titel, beskrivning, customDays, m.fl.)

### Database
- **[Uppgift 1.7c]** `prisma db push`: ny modell `UnmatchedPayment`; `RecurringSchedule` utökad med 12 fält; `RecurringFrequency`-enum fick `halfyearly` och `custom`

## [0.16.0] - 2026-05-19

### Added
- **[Uppgift 1.7b]** Fakturalista (DEL B): tabs Alla/Ej bokförda/Obetalda/Betalda/Makulerade med antal-badges, debounced sökning, datumfilter, bulk-åtgärder (skicka/räntefaktura/ta bort), sorterbara kolumner, paginering 10/25/100/250 med localStorage-persistence
- **[Uppgift 1.7b]** `GET /api/invoices` utökat med tab-filter, fri textsökning på 6 fält, parallell räkning av 5 tab-badges, stöd för comma-separerade type/status-filter
- **[Uppgift 1.7b]** `POST /api/invoices/bulk` — massåtgärder: skicka, ta bort utkast, skapa räntefakturor
- **[Uppgift 1.7b]** `POST /api/invoices/export` — export till CSV (UTF-8 BOM, semikolon) med filter/sortering, max 5 000 rader
- **[Uppgift 1.7b]** `GET /api/invoices/overdue` — sida med förfallna fakturor inkl. beräknad dröjsmålsränta
- **[Uppgift 1.7b]** `POST /api/invoices/[id]/create-interest-invoice` — skapar räntefaktura som utkast för en förfallen faktura

### Changed
- **[Uppgift 1.7b]** `InvoiceType`-enum utökad med `cash`, `recurring`, `interest` i Prisma-schema
- **[Uppgift 1.7b]** `Invoice`-modell utökad med `priceIncludesVat Boolean` fält
- **[Uppgift 1.7b]** `UpgradePrompt`-komponent: lagt till etiketter för `invoice_export`, `interest_invoices`, `bulk_actions`; rättat förbjudna färgklasser

### Database
- **[Uppgift 1.7b]** `prisma db push`: lade till `cash`, `recurring`, `interest` till `InvoiceType`-enum; lade till `priceIncludesVat` på `Invoice`

## [0.15.0] - 2026-05-19

### Added
- **[Fakturering]** Prisma-modeller: `PaymentTerm`, `Unit`, `OrgCurrency`, `DeliveryMethod`, `DeliveryTerms`, `PriceList`, `PriceListItem`, `InvoiceTemplate2`, `ExchangeRate` — fullständig grund för faktureringsinställningar
- **[Fakturering]** `Invoice`-modellen utökad med ~30 nya fält: valuta/kurs, leveransuppgifter, varumarkeringar, öresutjämning, påminnelseflaggor m.m.
- **[Fakturering]** `InvoiceLineItem` utökad med artikelnummer, lagerlokation, inköpspris, marginalprocent, momstyp m.m.
- **[Fakturering]** `Product` utökad med lagerlokation, inköpspris, konton och momstyp
- **[Fakturering]** `Organization` utökad med `invoicingSettings JSON` + relationer till alla nya inställningsmodeller
- **[Beräkningar]** `src/lib/invoicing/calculations.ts` — `calculateInvoice()` med BigInt öre-precision, VAT-uppdelning per momssats, öresutjämning via `applyRounding()`
- **[Beräkningar]** `src/lib/invoicing/rounding.ts` — `applyRounding()` med banker's rounding + `formatOre()`
- **[Beräkningar]** `src/lib/invoicing/margin.ts` — täckningsbidrag, marginalprocent, påläggsprocent
- **[Momstyper]** `src/lib/invoicing/vat-types.ts` — 13 momstyper (SE25/SE12/SE06/SE00/EU-varianter/EXPORT/OMVMOMS/MFRI/VMB25) med momsrutor och BAS-konton
- **[Valutakurser]** `src/lib/integrations/riksbank/client.ts` — Riksbanken SWEA API-klient med DB-cache, stöd för 24 valutor
- **[Valutakurser]** `src/lib/integrations/exchangerate-host/client.ts` — fallback-klient för valutakurser
- **[API]** `GET/PATCH /api/settings/invoicing` — hämta/uppdatera faktureringsinställningar (JSON blob)
- **[API]** `GET/POST /api/settings/payment-terms`, `PUT/DELETE /api/settings/payment-terms/[id]`
- **[API]** `GET/POST /api/settings/units`, `PUT/DELETE /api/settings/units/[id]`
- **[API]** `GET/POST /api/settings/currencies`, `PUT/DELETE /api/settings/currencies/[id]`
- **[API]** `GET/POST /api/settings/delivery-methods`, `PUT/DELETE /api/settings/delivery-methods/[id]`
- **[API]** `GET/POST /api/settings/delivery-terms`, `PUT/DELETE /api/settings/delivery-terms/[id]`
- **[API]** `GET/POST /api/settings/price-lists`, `GET/PUT/DELETE /api/settings/price-lists/[id]`, `POST /api/settings/price-lists/[id]/items`, `PUT/DELETE /api/settings/price-lists/[id]/items/[itemId]`
- **[API]** `GET/POST /api/settings/invoice-templates`, `PUT/DELETE /api/settings/invoice-templates/[id]`
- **[API]** `GET /api/settings/vat-types` — read-only lista av momstyper
- **[API]** `GET /api/exchange-rates` — hämta valutakurs med DB-cache + Riksbanken
- **[API]** `POST /api/exchange-rates/refresh` — hämta alla aktiva kurser manuellt
- **[Cron]** `GET /api/cron/exchange-rates` — daglig valutakurshämtning (körs 06:30 CET)
- **[Seed]** `src/lib/invoicing/seed.ts` — `seedInvoicingDefaults()`: skapar standardbetalningsvillkor, enheter, valutor, leveranssätt, leveransvillkor, prislista och fakturamall för nya organisationer
- **[Onboarding]** `seedInvoicingDefaults()` anropas vid organisationsskapande i `/api/onboarding` och `/api/register`
- **[UI]** `/settings/invoicing/` — ny inställningssida för fakturering med 11 flikar: Allmänt, Numrering, Betalningsvillkor, Enheter, Valutor, Leveranssätt, Leveransvillkor, Prislistor, Fakturamall, Påminnelser, Dröjsmålsränta
- **[UI]** `LookupTable`-komponent — generisk CRUD-tabell för alla uppslagstabeller
- **[Sidebar]** "Fakturering" länk tillagd i inställningsnavigeringen
- **[RBAC]** 9 nya permissionsgrupper: `INVOICING_SETTINGS`, `PAYMENT_TERMS`, `UNITS`, `CURRENCIES`, `DELIVERY_METHODS`, `DELIVERY_TERMS`, `PRICE_LISTS`, `INVOICE_TEMPLATES`, `EXCHANGE_RATES`
- **[Plans]** Features `multiple_price_lists` och `multiple_invoice_templates` (pro+)
- **[Tests]** 62 enhetstester: `calculateInvoice` (10 scenarier), `applyRounding` (8 scenarier), marginberäkningar (9 scenarier), VAT-typer (35 assertioner)
- **[Skript]** `scripts/migrate-existing-orgs-invoicing.ts` — idempotent backfill för befintliga organisationer

### Database
- **[Migration]** `20260518_001_invoicing_v2_foundation`: bakåtkompatibel migration med 9 nya tabeller och ~45 nya kolumner på befintliga tabeller

## [0.14.0] - 2026-05-19

### Added
- **[SRU-export]** Prisma-modell `SruExport` med enums `SruExportType` (k2/k3/ink2) och `SruExportStatus` (draft/final) samt migration `20250519_sru_export`
- **[SRU-export]** `src/lib/accounting/sru/types.ts` — typdefinitioner för SRU-dokument, fält och blanketter
- **[SRU-export]** `src/lib/accounting/sru/bas-mapping.ts` — BAS-kontointervall → SRU-fältnummer för INK2R (resultaträkning) och INK2S (balansräkning) med OSÄKERHET-kommentarer på alla approximerade fältmappningar
- **[SRU-export]** `src/lib/accounting/sru/format.ts` — `generateInfoSru()` och `generateBlankettSru()` — genererar INFO.SRU och BLANKETTER.SRU i Skatteverkets SRU-format; `normalizeOrgNumber()` normaliserar orgnr till 10 siffror utan bindestreck
- **[SRU-export]** `src/lib/accounting/sru/ink2.ts` — `generateInk2Sru()`: hämtar kontobalanser för ett räkenskapsår och mappar till INK2R + INK2S blanketter
- **[SRU-export]** `src/lib/accounting/sru/k2.ts` / `k3.ts` — wrappers för K2 (BFNAR 2016:10) och K3 (BFNAR 2012:1) med regelverk-specifika kommentarer
- **[API]** `POST /api/accounting/sru/generate` — genererar SRU-export för ett räkenskapsår (typ: k2/k3/ink2), kräver feature `sru_export` (pro+)
- **[API]** `GET /api/accounting/sru/[id]/download` — laddar ner SRU-exporten som ZIP-arkiv (INFO.SRU + BLANKETTER.SRU) utan externa ZIP-beroenden
- **[API]** `GET /api/accounting/sru` — listar alla SRU-exporter för organisationen
- **[UI]** SRU-exportsektion på `/year-end/[id]/download`-sidan: välj regelverk (K2/K3/INK2), generera, ladda ner ZIP; inkluderar ansvarsdisklaimer
- **[UI]** Ny sida `/reports/sru-history` — lista alla genererade SRU-filer med status och nedladdningslänk
- **[Sidebar]** "SRU-export" under Bokföring → Rapporter (feature-gated på `sru_export`)
- **[RBAC]** `SRU_EXPORT_PERMISSIONS` (read/generate) — owner/admin/accountant: full access; staff/viewer: read-only
- **[Plans]** Feature `sru_export` tillagd på pro och enterprise
- **[Tests]** 15 enhetstester i `tests/accounting/sru-export.test.ts` — orgnr-normalisering, SRU-filgenerering, BAS-kontomappning, `generateInk2Sru` (saknat orgnr, rätt blanketter, taxYear)

### Database
- **[SRU-export]** Migration `20250519_sru_export`: skapar `sru_exports`-tabell med `SruExportType`- och `SruExportStatus`-enums, FK till räkenskapsår och användare; lägger till `sru_export_generate` till `AuditAction`-enum

## [0.13.0] - 2026-05-18

### Added
- **[SIE-import]** Prisma-modell `SieImportJob` med enum `SieImportStatus` (pending/previewed/importing/completed/failed) samt migration `20250518_sie_import`
- **[SIE-import]** `src/lib/accounting/sie/parser.ts` — robust SIE 4i/4e-parser: CP437-avkodning, alla standardlabels (#VER, #TRANS, #KONTO, #IB, #UB, #RAR m.fl.), validering av dubbelbokning per VER med radnummer i felmeddelanden
- **[SIE-import]** `src/lib/accounting/sie/importer.ts` — `previewSieImport()` (dry-run diff) och `executeSieImport()`: kontouppslag/skapande, räkenskapsårsresolvering, hopp över stängda år, skippa dubbletter, per-verifikat felhantering
- **[API]** `POST /api/accounting/sie/import` — ladda upp SIE-fil, parsning + dry-run, sparar importjobb
- **[API]** `POST /api/accounting/sie/import/[id]/preview` — kör om dry-run med uppdaterade inställningar (kontomappning, serie, etc.)
- **[API]** `POST /api/accounting/sie/import/[id]/execute` — exekverar importen (idempotent, 409 om redan klar)
- **[API]** `GET /api/accounting/sie/import/[id]/status` — hämtar status och resultat för importjobb
- **[UI]** 5-stegs importguide på `/settings/import/sie`: (1) filuppladdning + charset, (2) parsningsresultat + verifikatförhandsgranskning, (3) kontomappning med diff-vy, (4) bekräftelseformulär med importinställningar, (5) resultat
- **[UI]** Inställningar → "Importera data" → "SIE-import" i inställningsnavigeringen
- **[RBAC]** `SIE_IMPORT_PERMISSIONS` (read/execute) + `ACCOUNTING_PERMISSIONS.IMPORT_SIE` — owner/admin: full access; staff/viewer: read-only
- **[Plans]** Feature `data_import` tillagd på alla planer (free och uppåt)
- **[Tests]** 15 enhetstester i `tests/accounting/sie-import.test.ts` — parser (CP437, obalans, objeklista), importer (dry-run, stängt år, duplikat, saknade konton, per-verifikat felhantering, tenant-isolation)

### Database
- **[SIE-import]** Migration `20250518_sie_import`: skapar `sie_import_jobs`-tabell med `SieImportStatus`-enum, unik index på `organizationId + fileHash`, FK till organisations och användare

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
