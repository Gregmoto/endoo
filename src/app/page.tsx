import Link from "next/link"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Endoo – Modern ekonomiplattform för företag och byråer",
  description:
    "Endoo samlar fakturering, bokföring, leverantörsfakturor, offerter, kundportal och AI-assistans i ett modernt system. Byggt för Sverige med BAS-kontoplan, SIE-export och inbyggt byråläge.",
  keywords:
    "ekonomiplattform, faktureringssystem, bokföringsprogram, ekonomisystem, byråsystem, momsdeklaration, SIE-export, BAS-kontoplan, leverantörsfaktura, OCR, AI-bokföring, offertsystem, kundportal",
  openGraph: {
    title: "Endoo – Hela ekonomin. En plattform.",
    description:
      "Fakturering, bokföring, leverantörsfakturor, offerter, kundportal och AI — i ett modernt system byggt för svenska regler.",
    url: "https://endoo.se",
    siteName: "Endoo",
    locale: "sv_SE",
    type: "website",
  },
  alternates: { canonical: "https://endoo.se" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLATFORM_FEATURES = [
  {
    icon: "◧",
    title: "Professionell fakturering",
    description:
      "Skapa, skicka och följ upp fakturor med automatisk numrering, momsberäkning, PDF-export och direktutskick via e-post. Kreditnotor och delbetalningar inkluderat.",
    tag: "Kärna",
    soon: false,
    href: "/funktioner#fakturering",
  },
  {
    icon: "↺",
    title: "Avtalsfakturering",
    description:
      "Sätt upp återkommande fakturering månadsvis, kvartalsvis eller årsvis. Systemet genererar fakturan automatiskt med snapshotade priser och duplikatskydd.",
    tag: "Automatisering",
    soon: false,
    href: "/funktioner#avtal",
  },
  {
    icon: "▤",
    title: "Komplett bokföring",
    description:
      "Dubbelbokhållning med BAS 2024-kontoplan, verifikationsserier, räkenskapsår och periodlåsning. Automatisk kontering vid fakturering och betalning.",
    tag: "Bokföring",
    soon: false,
    href: "/funktioner#bokforing",
  },
  {
    icon: "◱",
    title: "Finansiella rapporter",
    description:
      "Provbalans, resultaträkning och balansräkning i realtid. Huvudbok per konto, SIE4-export för revisorer och momsdeklaration i SKV-format.",
    tag: "Rapporter",
    soon: false,
    href: "/funktioner#rapporter",
  },
  {
    icon: "◨",
    title: "Leverantörsfakturor & OCR",
    description:
      "Fotografera eller ladda upp fakturan — AI extraherar leverantör, belopp, OCR-nummer och momssats. Granska, godkänn och bokför med ett klick.",
    tag: "AI",
    soon: false,
    href: "/funktioner#leverantorsfakturor",
  },
  {
    icon: "◩",
    title: "Offertsystem",
    description:
      "Skapa och skicka professionella offerter som kontakten accepterar online. Konvertera direkt till faktura eller avtal med ett klick.",
    tag: "Offert",
    soon: false,
    href: "/funktioner#offerter",
  },
  {
    icon: "◈",
    title: "Kunder & kontakter",
    description:
      "Strukturerat kundregister med org-nummer, VAT-nummer, kontaktpersoner och fakturahistorik. Per-kund betalningsvillkor och standardinställningar.",
    tag: "Kärna",
    soon: false,
    href: "/funktioner#kunder",
  },
  {
    icon: "▣",
    title: "Lagerhantering",
    description:
      "Spåra lagersaldo i realtid med rörligt genomsnitt. Inventering, inköp, försäljning och justeringstransaktioner — append-only ledger.",
    tag: "Lager",
    soon: false,
    href: "/funktioner#lager",
  },
  {
    icon: "◫",
    title: "Kundportal",
    description:
      "Ge dina kunder ett eget inlogg via magic link. De ser sina fakturor, laddar ner PDF och granskar sina avtal — utan att kontakta dig.",
    tag: "Portal",
    soon: false,
    href: "/funktioner#kundportal",
  },
  {
    icon: "✍",
    title: "E-signering",
    description:
      "Skicka dokument för digital signering direkt från plattformen. Kunden signerar i webbläsaren — revisionssäkert och juridiskt bindande.",
    tag: "Dokument",
    soon: false,
    href: "/funktioner#esignering",
  },
  {
    icon: "◰",
    title: "Momsdeklaration",
    description:
      "Beräkna moms per period automatiskt från bokföringen. Lås perioder med revisionssäker hash. Exportera i SKV-format.",
    tag: "Moms",
    soon: false,
    href: "/funktioner#moms",
  },
  {
    icon: "⬡",
    title: "API & integrationer",
    description:
      "REST API med API-nyckelautentisering och scope-baserade behörigheter. Koppla era egna system eller tredjepartsverktyg mot fakturor, kontakter och bokföring.",
    tag: "API",
    soon: false,
    href: "/funktioner#api",
  },
]

const ACCOUNTING_BULLETS = [
  { icon: "✦", text: "BAS 2024-kontoplan förinladdad — klar att använda direkt" },
  { icon: "✦", text: "Automatisk kontering vid faktura, betalning och kreditnota" },
  { icon: "✦", text: "Verifikationsserier med atomär sekvens — aldrig glapp i numrering" },
  { icon: "✦", text: "Periodlåsning och räkenskapsårsstängning" },
  { icon: "✦", text: "SIE4-export för revisorer och årsredovisningsbyråer" },
  { icon: "✦", text: "Provbalans, resultaträkning och balansräkning i realtid" },
]

const AI_BULLETS = [
  "Fråga om balansen — få svar direkt ur bokföringen",
  "Granska momsperioden innan deklaration",
  "Identifiera obalanser och avvikelser",
  "Konteringsförslag för leverantörsfakturor",
  "Streaming-svar — inga laddtider, inga spinner",
]

const AGENCY_FEATURES = [
  { icon: "◈", title: "Arbeta i kundkontots namn", desc: "Impersonera kunden och fakturera i deras namn. Full spårbarhet i aktivitetsloggen." },
  { icon: "◫", title: "Rollstyrning per medarbetare", desc: "Sätt åtkomstnivå per byrå-anställd och per kund — ägare, admin eller läsare." },
  { icon: "▦", title: "Byråöversikt", desc: "Se alla dina kundkonton på ett ställe — vilka har förfallna fakturor, aktiva avtal eller öppna ärenden." },
  { icon: "↺", title: "White-label", desc: "Varje kundkonto kan ha egen logotyp, färger och fakturamall. Perfekt för byråer som levererar under eget varumärke." },
]

const PLANS = [
  {
    name: "Gratis",
    price: "0",
    period: "kr/mån",
    description: "Kom igång utan kreditkort.",
    highlighted: false,
    features: [
      "1 användare",
      "5 fakturor per månad",
      "10 kontakter",
      "PDF-export",
      "Grundläggande bokföring",
    ],
    cta: "Kom igång",
    href: "/register",
  },
  {
    name: "Starter",
    price: "299",
    period: "kr/mån",
    description: "För frilansare och småföretag.",
    highlighted: false,
    features: [
      "3 användare",
      "Obegränsade fakturor",
      "100 kontakter",
      "Avtalsfakturering",
      "Full bokföring & rapporter",
      "Momsdeklaration",
      "Offertsystem & e-signering",
      "E-postutskick",
    ],
    cta: "Prova Starter",
    href: "/register?plan=starter",
  },
  {
    name: "Pro",
    price: "799",
    period: "kr/mån",
    description: "För byråer och växande team.",
    highlighted: true,
    features: [
      "10 användare",
      "Obegränsade fakturor & kontakter",
      "Byråläge — hantera kundkonton",
      "AI-assistent",
      "Leverantörsfakturor med OCR",
      "SIE4-export",
      "Lagerhantering",
      "Kundportal per kund",
      "API-åtkomst",
      "Prioriterad support",
    ],
    cta: "Prova Pro",
    href: "/register?plan=pro",
  },
  {
    name: "Enterprise",
    price: "Kontakta oss",
    period: "",
    description: "Skräddarsytt för större verksamheter.",
    highlighted: false,
    features: [
      "Obegränsade användare",
      "SSO / SAML",
      "Dedikerat API-stöd",
      "SLA-avtal",
      "Skräddarsydd onboarding",
      "White-label & custom domain",
      "Revisors-export",
    ],
    cta: "Kontakta oss",
    href: "mailto:enterprise@endoo.se",
  },
]

const TESTIMONIALS = [
  {
    quote:
      "Vi hanterar fakturering och bokföring för 14 kundkonton. Endoo är det enda system som faktiskt förstår hur byråer jobbar — vi behöver inte logga ut och in för varje kund.",
    name: "Anna K.",
    role: "Grundare, digital byrå",
    initials: "AK",
    color: "bg-violet-100 text-violet-700",
  },
  {
    quote:
      "AI-assistenten sparar oss en timme per momsperiod. Jag frågar 'stämmer rutorna?' och får ett svar direkt ur vår bokföring — inte ett generiskt AI-svar.",
    name: "Marcus L.",
    role: "Ekonomiansvarig, konsultbolag",
    initials: "ML",
    color: "bg-blue-100 text-blue-700",
  },
  {
    quote:
      "Äntligen ett ekonomisystem på svenska som inte känns som det kom från 2008. OCR-läsaren på leverantörsfakturor fungerar bättre än det vi hade hos Fortnox.",
    name: "Sofia E.",
    role: "Grundare, e-handelsbolag",
    initials: "SE",
    color: "bg-rose-100 text-rose-700",
  },
]

const INTEGRATIONS = [
  { name: "REST API", desc: "Cursor-paginerade endpoints för fakturor, kontakter, bokföring och lager" },
  { name: "API-nycklar", desc: "Scope-baserade nycklar med rate limiting och revocation" },
  { name: "SIE4-export", desc: "Standardformat för revisorer, årsredovisning och externa system" },
  { name: "Stripe", desc: "Fakturabetalning och prenumerationshantering" },
  { name: "Webhooks (snart)", desc: "Realtidshändelser för faktura betald, ny kund med mera" },
  { name: "Zapier (snart)", desc: "No-code-koppling mot tusentals appar" },
]

const FAQS = [
  {
    q: "Hur skiljer sig Endoo från Fortnox och Visma?",
    a: "Endoo är byggt från grunden för moderna arbetsflöden — realtidsrapporter, AI-assistans och byråstöd direkt i grundprodukten. Vi har inga licensmoduler eller dold prissättning. Gränssnittet är snabbt och mobilvänligt, inte portat från en skrivbordsapplikation från 2005.",
  },
  {
    q: "Kan jag hantera bokföringen i Endoo?",
    a: "Ja. Endoo har komplett dubbelbokhållning med BAS 2024-kontoplan, verifikationsserier, räkenskapsår och periodlåsning. Fakturering och betalning bokförs automatiskt. Du kan också skapa manuella verifikat och exportera SIE4-filer för revisorn.",
  },
  {
    q: "Hur fungerar AI-assistenten?",
    a: "AI-assistenten hämtar din faktiska bokföring, dina fakturor och ditt lagersaldo i realtid och svarar baserat på det — inte generiska råd. Du kan fråga 'stämmer mina momsrutor?', 'visa resultaträkningen för Q1' eller 'vilka fakturor är förfallna?'.",
  },
  {
    q: "Kan jag som byrå hantera flera kunder?",
    a: "Ja. Endoo har ett inbyggt byråläge där du kan arbeta direkt i kundkontots namn — fakturera, bokföra och rapportera — med full spårbarhet. Du ser alla dina kundkonton i en vy och kan byta utan att logga ut.",
  },
  {
    q: "Vad är kundportalen?",
    a: "Kundportalen är ett eget inlogg för dina kunder. De loggar in via e-post (magic link, inga lösenord) och kan se sina fakturor, ladda ner PDF och granska sina avtal — utan att behöva kontakta dig. Perfekt för byråer och tjänsteföretag.",
  },
  {
    q: "Hur fungerar offertsystemet?",
    a: "Du skapar en offert i systemet, lägger till rader och skickar den via e-post. Kunden öppnar en länk och accepterar eller avböjer direkt i webbläsaren. Du kan sedan konvertera en accepterad offert till faktura eller avtal med ett klick.",
  },
  {
    q: "Fungerar Endoo för svenska momsregler?",
    a: "Absolut. Endoo hanterar 25%, 12% och 6% moms, momsperioder (månadsvis/kvartalsvis/årsvis), låsning av deklarerade perioder med revisionssäker hash och stödjer SKV-format. Fakturor uppfyller Skatteverkets krav på innehåll och numrering.",
  },
  {
    q: "Vad är SIE4-export och behöver jag det?",
    a: "SIE4 är det svenska standardformatet för att exportera bokföring till revisorer, årsredovisningsbyråer och andra system. Om din revisor ber om 'SIE-filen' — det är det Endoo exporterar med ett klick.",
  },
  {
    q: "Hur fungerar OCR på leverantörsfakturor?",
    a: "Du laddar upp en PDF eller bild. Claude AI extraherar leverantörsnamn, belopp, OCR-nummer, förfallodatum och momssats. Du granskar, korrigerar vid behov och godkänner — systemet bokför automatiskt på rätt konton.",
  },
  {
    q: "Har Endoo ett API?",
    a: "Ja. Endoo erbjuder ett REST API med scope-baserade API-nycklar. Du kan hämta fakturor, kontakter, produkter, verifikat och lagersaldo. Webhooks och fler write-endpoints kommer i nästa fas.",
  },
]

const STATS = [
  { value: "< 2 min", label: "Från registrering till första faktura" },
  { value: "BAS 2024", label: "Kontoplan förinladdad och klar" },
  { value: "12+", label: "Moduler i en plattform" },
  { value: "99.9%", label: "Drifttid — Neon + Vercel infrastruktur" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await auth()
  const orgSlug = (session as { activeOrgSlug?: string } | null)?.activeOrgSlug
  return (
    <main className="min-h-screen bg-card text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black leading-none">E</span>
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">endoo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <Link href="/funktioner"  className="hover:text-foreground transition-colors">Funktioner</Link>
            <Link href="/byra"        className="hover:text-foreground transition-colors">För byråer</Link>
            <Link href="/artiklar"    className="hover:text-foreground transition-colors">Artiklar</Link>
            <a    href="#priser"      className="hover:text-foreground transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            {orgSlug ? (
              <Link
                href={`/${orgSlug}`}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Till appen →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Logga in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Kom igång gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-indigo-50/30 to-card -z-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-100/40 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/4" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-card border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Nu i beta · Gratis att testa · Byggt i Sverige 🇸🇪
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] tracking-tight mb-7">
            En modern ekonomi-<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              plattform för alla.
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed mb-12 max-w-3xl mx-auto font-light">
            Fakturering, bokföring, offerter, kundportal och AI-assistans — samlat i ett modernt system byggt för svenska regler.{" "}
            <span className="text-foreground font-medium">Äntligen ett alternativ till Fortnox och Visma som faktiskt känns 2025.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-9 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
              Skapa konto gratis →
            </Link>
            <Link
              href="/funktioner"
              className="w-full sm:w-auto px-9 py-4 bg-card border border text-foreground font-semibold rounded-2xl hover:bg-muted hover:border transition-all text-lg"
            >
              Se alla funktioner
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Inget kreditkort · Inga bindningstider · GDPR-säkert · Driftas i EU
          </p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section className="border-y border bg-card py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 mb-1.5">{s.value}</p>
              <p className="text-sm text-muted-foreground leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform features ───────────────────────────────────────────────── */}
      <section id="funktioner" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Plattformen</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-5 leading-tight">
              Allt ditt företag behöver.<br />Ingenting du inte behöver.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Endoo är ingen samling hopkopplade moduler — det är en plattform där fakturering, bokföring, offerter och rapporter pratar med varandra från dag ett.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLATFORM_FEATURES.map(f => (
              <Link
                key={f.title}
                href={f.href}
                className="group p-7 rounded-2xl border border bg-card hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {f.icon}
                  </div>
                  <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-2.5 text-lg leading-snug">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/funktioner" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline text-sm">
              Se fullständig funktionslista →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Accounting deep-dive ────────────────────────────────────────────── */}
      <section id="bokforing" className="py-28 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-5">Bokföring</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
              Riktig bokföring.<br />Inte ett kalkylblad.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Endoo har komplett dubbelbokhållning — inte ett förenklat kassaflöde. BAS 2024-kontoplanen är förinladdad och klar. Bokföringen uppdateras automatiskt när du fakturerar, registrerar en betalning eller godkänner en leverantörsfaktura.
            </p>
            <ul className="space-y-3.5 mb-10">
              {ACCOUNTING_BULLETS.map(b => (
                <li key={b.text} className="flex items-start gap-3">
                  <span className="text-indigo-400 text-sm mt-0.5 flex-shrink-0">{b.icon}</span>
                  <span className="text-muted-foreground text-sm leading-relaxed">{b.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-block px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                Starta din bokföring gratis →
              </Link>
              <Link
                href="/artiklar/vad-ar-bas-kontoplan"
                className="inline-block px-7 py-3.5 border border-slate-600 text-muted-foreground font-semibold rounded-xl hover:border-slate-400 transition-colors text-sm"
              >
                Vad är BAS-kontoplan?
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">Verifikat A-0042 · 2025-05-17</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-2">
              {[
                { acc: "1510", name: "Kundfordringar", dr: "18 750", cr: "—", color: "text-emerald-400" },
                { acc: "3001", name: "Försäljning 25%", dr: "—", cr: "15 000", color: "text-slate-300" },
                { acc: "2610", name: "Utgående moms 25%", dr: "—", cr: "3 750", color: "text-slate-300" },
              ].map(row => (
                <div key={row.acc} className="flex items-center gap-4">
                  <span className="text-indigo-400 w-12">{row.acc}</span>
                  <span className="text-muted-foreground flex-1 text-xs">{row.name}</span>
                  <span className={`w-16 text-right ${row.color}`}>{row.dr}</span>
                  <span className={`w-16 text-right ${row.color}`}>{row.cr}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-700 flex items-center gap-4">
                <span className="text-muted-foreground w-12">—</span>
                <span className="text-muted-foreground flex-1 text-xs">Summa</span>
                <span className="text-indigo-300 w-16 text-right font-bold">18 750</span>
                <span className="text-indigo-300 w-16 text-right font-bold">18 750</span>
              </div>
              <div className="pt-2">
                <span className="text-xs text-emerald-400 font-medium">✓ Balanserat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI section ──────────────────────────────────────────────────────── */}
      <section id="ai" className="py-28 px-6 bg-gradient-to-b from-white to-indigo-50/40">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="rounded-2xl bg-card border border shadow-xl shadow-muted overflow-hidden order-last lg:order-first">
            <div className="flex items-center gap-3 px-5 py-4 border-b border">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-black">E</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Endoo AI</p>
                <p className="text-xs text-muted-foreground">Ansluten till din bokföring</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
                  Stämmer mina momsrutor för april?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-600 text-xs font-black">E</span>
                </div>
                <div className="bg-muted border border text-sm text-foreground px-4 py-3 rounded-2xl rounded-tl-sm max-w-sm leading-relaxed">
                  Jag har granskat din bokföring för april 2025. Ruta 05 visar <strong>142 800 kr</strong> i momspliktiga intäkter och ruta 10 <strong>35 700 kr</strong> i utgående moms. Ingående moms (ruta 48) är <strong>8 250 kr</strong>. Att betala: <strong>27 450 kr</strong>. Allt ser korrekt ut. ✓
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
                  Vilka fakturor är förfallna?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-600 text-xs font-black">E</span>
                </div>
                <div className="bg-muted border border text-sm text-foreground px-4 py-3 rounded-2xl rounded-tl-sm max-w-sm leading-relaxed">
                  Du har <strong>3 förfallna fakturor</strong> med ett totalt utestående belopp på <strong>54 250 kr</strong>. Äldsta är INV-0089 till Kund AB, förfallen för 14 dagar sedan.
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-5">AI-assistent</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-6">
              Fråga din AI.<br />Få svar ur din<br />faktiska data.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Endoos AI-assistent är inte ett generiskt chatbot — den läser din bokföring, dina fakturor och ditt lager i realtid och svarar baserat på dina faktiska siffror. Powered by Claude.
            </p>
            <ul className="space-y-3 mb-10">
              {AI_BULLETS.map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/register?plan=pro" className="inline-block px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                Prova AI-assistenten →
              </Link>
              <Link href="/artiklar/ai-bokforing" className="inline-block px-7 py-3.5 border border text-muted-foreground font-semibold rounded-xl hover:border-indigo-200 transition-colors text-sm">
                Så fungerar AI i bokföring
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Offers & Portal section ─────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Offerter & Kundportal</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-5">
              Från offert till betald faktura.<br />Allt i ett flöde.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Skapa en offert, låt kunden acceptera online, konvertera till faktura med ett klick. Ge kunden ett eget login till sin portal — inga fler mejl om "har ni skickat fakturan?".
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "◩",
                title: "Offertsystem",
                desc: "Skapa och skicka professionella offerter. Kunden accepterar eller avböjer direkt i webbläsaren. Konvertera till faktura eller avtal med ett klick.",
                badge: null,
              },
              {
                icon: "✍",
                title: "E-signering",
                desc: "Skicka avtal och dokument för digital signering. Kunden signerar i webbläsaren — revisionssäkert och juridiskt bindande.",
                badge: null,
              },
              {
                icon: "◫",
                title: "Kundportal",
                desc: "Ge dina kunder ett eget inlogg via magic link. De ser sina fakturor, laddar ner PDF och granskar avtal — utan att behöva fråga dig.",
                badge: null,
              },
            ].map(f => (
              <div key={f.title} className="bg-card rounded-2xl border border p-7 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold">
                    {f.icon}
                  </div>
                  {f.badge && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{f.badge}</span>
                  )}
                </div>
                <h3 className="font-bold text-foreground mb-2.5 text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency section ──────────────────────────────────────────────────── */}
      <section id="byra" className="py-28 px-6 bg-indigo-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3.5 py-1.5 bg-card/15 text-white text-xs font-bold rounded-full uppercase tracking-widest mb-6">
              Byråläge
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
              Byggt för byråer som<br />hanterar flera kunder
            </h2>
            <p className="text-indigo-200 text-lg max-w-2xl mx-auto leading-relaxed">
              Endoo är det enda ekonomisystemet med inbyggt byråstöd. Arbeta i dina kunders konton, fakturera i deras namn och håll full kontroll — utan att logga ut och in.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {AGENCY_FEATURES.map(f => (
              <div key={f.title} className="bg-card/10 backdrop-blur rounded-2xl p-6 border border-white/15">
                <div className="text-2xl mb-4 text-white/60">{f.icon}</div>
                <h3 className="font-bold text-white mb-2 text-base">{f.title}</h3>
                <p className="text-indigo-200 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-md mx-auto bg-card/10 rounded-2xl border border-white/20 overflow-hidden mb-12">
            <div className="px-5 py-3.5 border-b border-white/10">
              <p className="text-white text-sm font-semibold">Mina kundkonton</p>
            </div>
            {[
              { name: "Kund AB",          status: "3 fakturor",           dot: "bg-emerald-400" },
              { name: "Webbyrån Norr",    status: "1 förfallen · Påminn", dot: "bg-red-400" },
              { name: "Konsult & Co",     status: "5 aktiva avtal",       dot: "bg-indigo-300" },
              { name: "Startup XYZ",      status: "Betalad idag ✓",       dot: "bg-emerald-400" },
              { name: "Kreativa Studio",  status: "Bokföring: 2 poster",  dot: "bg-amber-400" },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 hover:bg-card/5 transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="text-white text-sm font-medium flex-1">{item.name}</span>
                <span className="text-indigo-300 text-xs">{item.status}</span>
              </div>
            ))}
          </div>

          <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-block px-9 py-4 bg-card text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors text-lg shadow-xl shadow-indigo-900/20"
            >
              Skapa byråkonto gratis →
            </Link>
            <Link
              href="/byra"
              className="inline-block px-9 py-4 border border-white/30 text-white font-semibold rounded-2xl hover:bg-card/10 transition-colors text-lg"
            >
              Läs mer om byråläget
            </Link>
          </div>
        </div>
      </section>

      {/* ── API & integrations ──────────────────────────────────────────────── */}
      <section id="api" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-5">API & Integrationer</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-6">
              Koppla Endoo till<br />resten av din stack.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              REST API med scope-baserade API-nycklar, cursor-paginering och rate limiting. Hämta fakturor, kontakter, bokföring och lager från dina egna system eller integrera via tredjepartsverktyg.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {INTEGRATIONS.map(i => (
                <div key={i.name} className="p-4 rounded-xl border border bg-muted/50">
                  <p className="font-semibold text-foreground text-sm mb-1">{i.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{i.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 overflow-hidden shadow-2xl shadow-slate-200">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">GET /api/v1/invoices</span>
            </div>
            <div className="p-6 font-mono text-xs leading-relaxed">
              <div className="text-muted-foreground mb-3">{'// Autentisera med Bearer token'}</div>
              <div>
                <span className="text-violet-400">curl</span>
                <span className="text-muted-foreground"> https://endoo.se/api/v1/invoices \</span>
              </div>
              <div className="pl-4">
                <span className="text-muted-foreground">-H </span>
                <span className="text-emerald-400">&quot;Authorization: Bearer endo_live_...&quot;</span>
              </div>
              <div className="mt-5 text-muted-foreground">{'// Svar'}</div>
              <div className="mt-2 text-muted-foreground">{'{'}</div>
              <div className="pl-4">
                <div><span className="text-blue-400">&quot;object&quot;</span><span className="text-muted-foreground">: </span><span className="text-emerald-400">&quot;list&quot;</span><span className="text-muted-foreground">,</span></div>
                <div><span className="text-blue-400">&quot;data&quot;</span><span className="text-muted-foreground">: [</span></div>
                <div className="pl-4 text-muted-foreground">{'{'}</div>
                <div className="pl-8"><span className="text-blue-400">&quot;id&quot;</span><span className="text-muted-foreground">: </span><span className="text-emerald-400">&quot;inv_uuid...&quot;</span><span className="text-muted-foreground">,</span></div>
                <div className="pl-8"><span className="text-blue-400">&quot;invoice_number&quot;</span><span className="text-muted-foreground">: </span><span className="text-emerald-400">&quot;INV-0042&quot;</span><span className="text-muted-foreground">,</span></div>
                <div className="pl-8"><span className="text-blue-400">&quot;total_amount&quot;</span><span className="text-muted-foreground">: </span><span className="text-amber-400">18750</span><span className="text-muted-foreground">,</span></div>
                <div className="pl-8"><span className="text-blue-400">&quot;status&quot;</span><span className="text-muted-foreground">: </span><span className="text-emerald-400">&quot;paid&quot;</span></div>
                <div className="pl-4 text-muted-foreground">{'}'}</div>
                <div className="text-muted-foreground">],</div>
                <div><span className="text-blue-400">&quot;has_more&quot;</span><span className="text-muted-foreground">: </span><span className="text-amber-400">false</span></div>
              </div>
              <div className="text-muted-foreground">{'}'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Vad användarna säger</p>
            <h2 className="text-4xl font-black text-foreground">Företag som redan kört igång</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-card rounded-2xl border border p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex mb-5">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="priser" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Priser</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-5">Enkla priser. Inga dolda avgifter.</h2>
            <p className="text-lg text-muted-foreground">Börja gratis. Uppgradera när du växer. Inga bindningstider.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-7 border flex flex-col ${
                  p.highlighted
                    ? "border-indigo-500 shadow-2xl shadow-indigo-100 bg-indigo-600 ring-4 ring-indigo-100"
                    : "border bg-card"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-400 text-amber-900 text-xs font-black rounded-full uppercase tracking-wide shadow-lg">
                    Mest populär
                  </div>
                )}

                <div className="mb-7">
                  <h3 className={`font-black text-xl mb-1 ${p.highlighted ? "text-white" : "text-foreground"}`}>
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    {p.period ? (
                      <>
                        <span className={`text-4xl font-black ${p.highlighted ? "text-white" : "text-foreground"}`}>{p.price}</span>
                        <span className={`text-sm ${p.highlighted ? "text-indigo-200" : "text-muted-foreground"}`}>{p.period}</span>
                      </>
                    ) : (
                      <span className={`text-2xl font-black ${p.highlighted ? "text-white" : "text-foreground"}`}>{p.price}</span>
                    )}
                  </div>
                  <p className={`text-sm ${p.highlighted ? "text-indigo-200" : "text-muted-foreground"}`}>{p.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${p.highlighted ? "text-indigo-100" : "text-muted-foreground"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${p.highlighted ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.href}
                  className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${
                    p.highlighted
                      ? "bg-card dark:bg-white text-indigo-700 hover:bg-indigo-50"
                      : p.name === "Enterprise"
                        ? "border-2 border text-foreground hover:border-indigo-300 hover:text-indigo-600"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              Alla priser exkl. moms. Faktureringscykel: månadsvis. Avsluta när du vill.{" "}
              <a href="mailto:enterprise@endoo.se" className="text-indigo-600 hover:underline">Kontakta oss</a>{" "}
              för Enterprise-villkor och SLA.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-28 px-6 bg-muted">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="text-4xl font-black text-foreground">Vanliga frågor</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="group bg-card rounded-2xl border border px-7 py-5 cursor-pointer hover:border-indigo-100 transition-colors">
                <summary className="flex items-center justify-between font-semibold text-foreground text-sm list-none gap-4">
                  <span>{f.q}</span>
                  <span className="text-muted-foreground group-open:text-indigo-500 text-xl flex-shrink-0 transition-colors group-open:rotate-45 duration-200">+</span>
                </summary>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed pr-4">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/artiklar" className="text-indigo-600 text-sm font-semibold hover:underline">
              Fler guider och artiklar om ekonomi →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mid CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">För frilansare & småföretag</p>
            <h3 className="text-xl font-black text-foreground mb-3">Kom igång på 2 minuter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Skapa ett konto, lägg till en kund och skicka din första faktura — allt gratis, inga kreditkort.
            </p>
            <Link href="/register" className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Skapa gratis konto →
            </Link>
          </div>
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">För byråer & redovisningskonsulter</p>
            <h3 className="text-xl font-black text-white mb-3">Hantera alla dina kunder</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Byråläget i Pro-planen låter dig arbeta i kundens konto, fakturera i deras namn och se allt i en vy.
            </p>
            <Link href="/byra" className="inline-block px-5 py-2.5 bg-card text-foreground text-sm font-semibold rounded-xl hover:bg-muted transition-colors">
              Läs mer om byråläget →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200">
            <span className="text-white text-3xl font-black">E</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-6 leading-tight">
            Redo att byta till ett<br />ekonomisystem som<br />faktiskt fungerar?
          </h2>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Skapa ett konto gratis och upplev skillnaden. Inget kreditkort. Inga bindningstider. Flytta din data när du vill med SIE-export.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all text-lg shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
              Skapa konto gratis →
            </Link>
            <a
              href="mailto:hej@endoo.se"
              className="w-full sm:w-auto px-10 py-4 border-2 border text-foreground font-semibold rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-lg"
            >
              Boka en demo
            </a>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Inget kreditkort · GDPR-säkert · Data lagras i EU · Byggt och driftat i Sverige 🇸🇪
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border bg-muted py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-black">E</span>
                </div>
                <span className="text-lg font-extrabold text-foreground">endoo</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                En modern ekonomiplattform för företag och byråer. Fakturering, bokföring och AI samlat i ett system. Byggt i Sverige.
              </p>
            </div>

            {/* Produkt */}
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Produkt</p>
              <nav className="space-y-2.5 text-sm text-muted-foreground">
                <Link href="/funktioner"         className="block hover:text-foreground transition-colors">Alla funktioner</Link>
                <a href="#bokforing"             className="block hover:text-foreground transition-colors">Bokföring</a>
                <a href="#ai"                    className="block hover:text-foreground transition-colors">AI-assistent</a>
                <Link href="/byra"               className="block hover:text-foreground transition-colors">För byråer</Link>
                <a href="#api"                   className="block hover:text-foreground transition-colors">API</a>
                <a href="#priser"                className="block hover:text-foreground transition-colors">Priser</a>
              </nav>
            </div>

            {/* Lösningar */}
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Lösningar</p>
              <nav className="space-y-2.5 text-sm text-muted-foreground">
                <Link href="/byra"          className="block hover:text-foreground transition-colors">Redovisningsbyråer</Link>
                <Link href="/konsulter"     className="block hover:text-foreground transition-colors">Konsulter & frilansare</Link>
                <Link href="/smaforetag"    className="block hover:text-foreground transition-colors">Småföretag</Link>
                <Link href="/e-handel"      className="block hover:text-foreground transition-colors">E-handel & lager</Link>
              </nav>
            </div>

            {/* Artiklar */}
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Artiklar</p>
              <nav className="space-y-2.5 text-sm text-muted-foreground">
                <Link href="/artiklar"                          className="block hover:text-foreground transition-colors">Alla artiklar</Link>
                <Link href="/artiklar/vad-ar-ett-ekonomisystem" className="block hover:text-foreground transition-colors">Vad är ett ekonomisystem?</Link>
                <Link href="/artiklar/vad-ar-bas-kontoplan"     className="block hover:text-foreground transition-colors">BAS-kontoplan</Link>
                <Link href="/artiklar/digital-fakturering"      className="block hover:text-foreground transition-colors">Digital fakturering</Link>
                <Link href="/artiklar/ai-bokforing"             className="block hover:text-foreground transition-colors">AI i bokföring</Link>
              </nav>
            </div>

            {/* Konto */}
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Konto</p>
              <nav className="space-y-2.5 text-sm text-muted-foreground">
                <Link href="/login"             className="block hover:text-foreground transition-colors">Logga in</Link>
                <Link href="/register"          className="block hover:text-foreground transition-colors">Skapa konto</Link>
                <a href="mailto:hej@endoo.se"   className="block hover:text-foreground transition-colors">Support</a>
                <a href="mailto:enterprise@endoo.se" className="block hover:text-foreground transition-colors">Enterprise</a>
              </nav>
            </div>
          </div>

          <div className="border-t border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-muted-foreground transition-colors">Integritetspolicy</Link>
              <Link href="/terms"   className="hover:text-muted-foreground transition-colors">Användarvillkor</Link>
              <Link href="/cookies" className="hover:text-muted-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
