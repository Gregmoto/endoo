import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Endoo för byråer – Hantera alla dina kundkonton",
  description:
    "Endoos byråläge låter dig arbeta i kundkontots namn, fakturera i deras namn, hantera bokföring och se alla kunder i en vy. White-label, rollstyrning och full spårbarhet.",
  keywords: "redovisningsbyrå, ekonomisystem byrå, byråläge, kundkonton, white-label, redovisningskonsult",
  alternates: { canonical: "https://endoo.se/byra" },
  openGraph: {
    title: "Endoo för byråer",
    description: "Hantera alla dina kundkonton i ett login. Byråläge med white-label, rollstyrning och full spårbarhet.",
    url: "https://endoo.se/byra",
  },
}

const FEATURES = [
  {
    icon: "◈",
    title: "Arbeta i kundkontots namn",
    desc: "Med ett klick byter du till ett kundkonto och arbetar precis som om du vore kunden — fakturera, bokför, skapa rapporter. Allt med din byrås login. Full aktivitetslogg för varje händelse.",
  },
  {
    icon: "◫",
    title: "Rollstyrning per medarbetare",
    desc: "Styr exakt vad varje byrå-anställd får göra i varje kundkonto. Ägare, admin, handläggare eller läsare — granulär åtkomstkontroll som skyddar känslig kunddata.",
  },
  {
    icon: "▦",
    title: "Byråöversikt",
    desc: "Se alla dina kundkonton i en gemensam vy. Vilka har förfallna fakturor? Vilka har öppna offerter? Vilka konton saknar aktiv bokföring? Allt på ett ställe.",
  },
  {
    icon: "◩",
    title: "White-label",
    desc: "Varje kundkonto kan ha sin egen logotyp, primärfärg, fakturamall och avsändarnamn. Kunden ser aldrig Endoo — de ser din byrå eller deras eget varumärke.",
  },
  {
    icon: "◱",
    title: "Separata inställningar",
    desc: "Varje kundkonto har egna fakturanummer-serier, bankgiro, momsperioder, valuta och räkenskapsår. Perfekt för kunder med varierande behov och verksamhetsstrukturer.",
  },
  {
    icon: "↺",
    title: "Avtalsfakturering per kund",
    desc: "Sätt upp återkommande avtal för varje kund med automatisk fakturering. Systemet skickar fakturan i rätt tid — du behöver inte lyfta ett finger.",
  },
  {
    icon: "◧",
    title: "Kundportal per kund",
    desc: "Varje kund du hanterar kan få sin egen kundportal med magic link-inlogg. De ser sina fakturor, avtal och offerter — utan att kontakta dig.",
  },
  {
    icon: "✍",
    title: "E-signering och offerter",
    desc: "Skapa offerter och dokument för e-signering direkt från kundkontot. Kunden signerar i webbläsaren — revisionssäkert och kopplat till rätt konto.",
  },
]

const USE_CASES = [
  {
    title: "Redovisningsbyrå",
    desc: "Hantera bokföring, momsdeklarationer och årsredovisning för 10–200 kundkonton. Importera SIE-filer, exportera underlag för revisorer och håll alla konton uppdaterade i realtid.",
    tag: "Vanligaste användningen",
  },
  {
    title: "Digital- eller kommunikationsbyrå",
    desc: "Fakturera löpande uppdrag och fasta månadsarvoden. Konvertera offerter till avtalsfakturering automatiskt. Se alla kunders fakturahistorik i en vy.",
    tag: "",
  },
  {
    title: "Managementkonsult eller interim CFO",
    desc: "Arbeta operativt i kundens ekonomisystem som om du vore anställd. Full bokföringsåtkomst, rapporter och deklarationsunderlag — utan att byråns login syns för kunden.",
    tag: "",
  },
  {
    title: "IT- och SaaS-byrå",
    desc: "Sätt upp white-label-portaler för dina kunders slutkunder. API-integration mot ert eget system. Fakturaexport via REST API för automatiserade flöden.",
    tag: "",
  },
]

const PLANS = [
  {
    name: "Pro",
    price: "799",
    period: "kr/mån",
    description: "För byråer med upp till 10 medarbetare",
    features: [
      "10 användare per konto",
      "Obegränsade kundkonton",
      "Byråläge och impersonering",
      "White-label per kund",
      "AI-assistent",
      "Leverantörsfakturor med OCR",
      "SIE4-export",
      "API-åtkomst",
      "Prioriterad support",
    ],
    cta: "Prova Pro gratis",
    href: "/register?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Kontakta oss",
    period: "",
    description: "För byråer med fler medarbetare eller specialkrav",
    features: [
      "Obegränsade användare",
      "SSO / SAML",
      "Dedikerat API-stöd",
      "SLA-avtal",
      "Skräddarsydd onboarding",
      "Custom domain och white-label",
      "Revisors-export och audit log",
    ],
    cta: "Kontakta oss",
    href: "mailto:enterprise@endoo.se",
    highlighted: false,
  },
]

const FAQS = [
  {
    q: "Hur många kundkonton kan jag hantera?",
    a: "Obegränsat. Du kan ha hur många kundkonton som helst i Pro-planen. Varje konto räknas som en separat organisation med egna fakturor, bokföring och inställningar.",
  },
  {
    q: "Kan mina kundkonton logga in själva?",
    a: "Ja. Varje kundkonto kan ha sina egna användare med eget inlogg. Du som byrå kan också bjuda in kunderna till sin kundportal via magic link — de behöver inget eget konto.",
  },
  {
    q: "Syns det att jag som byrå arbetar i kundens konto?",
    a: "I aktivitetsloggen syns alla händelser med information om vem som utförde dem. Det kan du styra vad kunden ser — men för revisionssyften är spårbarhet alltid aktivt.",
  },
  {
    q: "Kan jag sätta upp white-label med kundens logotyp?",
    a: "Ja. Varje kundkonto kan ha sin egen logotyp, primärfärg och avsändarnamn på fakturor och e-postmeddelanden. Kunden och deras kunder ser aldrig Endoo-varumärket.",
  },
  {
    q: "Fungerar SIE-export för alla kunder?",
    a: "Ja. Du kan exportera SIE4-filer för varje kundkonto separat. Perfekt för revisorer och årsredovisningsbyråer.",
  },
]

export default function ByraPage() {
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
            <Link href="/funktioner" className="hover:text-foreground transition-colors">Funktioner</Link>
            <Link href="/byra"       className="text-indigo-600 font-semibold">För byråer</Link>
            <Link href="/artiklar"   className="hover:text-foreground transition-colors">Artiklar</Link>
            <a    href="/#priser"    className="hover:text-foreground transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Kom igång gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,.08),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-block px-3.5 py-1.5 bg-card/15 text-white text-xs font-bold rounded-full uppercase tracking-widest mb-8">
            Byråläge · Pro & Enterprise
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-7">
            Endoo för byråer<br />som hanterar<br />
            <span className="text-indigo-200">flera kunder.</span>
          </h1>
          <p className="text-xl text-indigo-200 leading-relaxed mb-12 max-w-2xl mx-auto">
            Inbyggt byråstöd med impersonering, white-label, rollstyrning och byråöversikt. Allt din byrå behöver — utan att logga ut och in för varje kund.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?plan=pro"
              className="w-full sm:w-auto px-9 py-4 bg-card text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-all text-lg shadow-xl shadow-indigo-900/20"
            >
              Skapa byråkonto gratis →
            </Link>
            <a
              href="mailto:hej@endoo.se"
              className="w-full sm:w-auto px-9 py-4 border border-white/30 text-white font-semibold rounded-2xl hover:bg-card/10 transition-all text-lg"
            >
              Boka en demo
            </a>
          </div>
          <p className="mt-8 text-sm text-indigo-300">
            Inget kreditkort · 14 dagars gratis testperiod
          </p>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Byråfunktioner</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-5 leading-tight">
              Allt en byrå behöver.<br />Inget en byrå inte behöver.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Byråläget är inte en modul du köper till — det är inbyggt i plattformen från dag ett.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-7 rounded-2xl border border bg-card hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all">
                <div className="text-2xl text-indigo-400 mb-4">{f.icon}</div>
                <h3 className="font-bold text-foreground mb-2.5 text-base leading-snug">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Användningsfall</p>
            <h2 className="text-4xl font-black text-foreground mb-4">Vem använder byråläget?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {USE_CASES.map(u => (
              <div key={u.title} className="bg-card rounded-2xl border border p-8 hover:border-indigo-100 transition-colors">
                <div className="flex items-start gap-3 mb-4">
                  <h3 className="font-black text-foreground text-xl">{u.title}</h3>
                  {u.tag && (
                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full flex-shrink-0 mt-1">
                      {u.tag}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Client list mockup ──────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-5">Byråöversikt</p>
            <h2 className="text-4xl font-black text-foreground mb-6 leading-tight">
              Alla dina kunder.<br />En gemensam vy.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Byråöversikten visar samtliga kundkonton du hanterar med status i realtid. Se direkt vilka kunder som har förfallna fakturor, aktiva avtal, öppen bokföring eller väntande offerter.
            </p>
            <ul className="space-y-3 mb-10">
              {[
                "Status per kund — förfallna fakturor, aktiva avtal",
                "Byt konto med ett klick — inget utlogg",
                "Sök och filtrera bland alla kundkonton",
                "Snabbåtgärder direkt från översikten",
              ].map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card border border shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border flex items-center justify-between">
              <p className="font-semibold text-foreground text-sm">Byråöversikt</p>
              <span className="text-xs text-muted-foreground">8 kundkonton</span>
            </div>
            {[
              { name: "Kund AB",           status: "3 fakturor skickade",    dot: "bg-emerald-400", action: "Visa" },
              { name: "Webbyrån Norr",     status: "1 förfallen faktura",    dot: "bg-red-400",     action: "Påminn" },
              { name: "Konsult & Co",      status: "5 aktiva avtal",         dot: "bg-indigo-400",  action: "Visa" },
              { name: "Startup XYZ",       status: "Betalad idag ✓",         dot: "bg-emerald-400", action: "Visa" },
              { name: "Kreativa Studio",   status: "Bokföring: 2 poster",    dot: "bg-amber-400",   action: "Bokför" },
              { name: "Byggfirman Syd",    status: "Offert väntar svar",     dot: "bg-violet-400",  action: "Visa" },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 hover:bg-muted transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="text-foreground text-sm font-medium flex-1">{item.name}</span>
                <span className="text-muted-foreground text-xs flex-1">{item.status}</span>
                <span className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-muted">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">Priser för byråer</p>
            <h2 className="text-4xl font-black text-foreground mb-4">Välj plan för din byrå</h2>
            <p className="text-muted-foreground">Börja med Pro — uppgradera till Enterprise när ni växer.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 border flex flex-col ${
                  p.highlighted
                    ? "bg-indigo-600 border-indigo-500 ring-4 ring-indigo-100"
                    : "bg-card border"
                }`}
              >
                <h3 className={`font-black text-2xl mb-2 ${p.highlighted ? "text-white" : "text-foreground"}`}>{p.name}</h3>
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
                <p className={`text-sm mb-8 ${p.highlighted ? "text-indigo-200" : "text-muted-foreground"}`}>{p.description}</p>
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
                      : "border-2 border text-foreground hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground">Vanliga frågor från byråer</h2>
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
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-5 leading-tight">
            Redo att effektivisera<br />din byrå?
          </h2>
          <p className="text-indigo-200 text-lg mb-10 leading-relaxed">
            Skapa ett byråkonto gratis och lägg till dina första kundkonton på minuter. Inget kreditkort.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?plan=pro"
              className="w-full sm:w-auto px-9 py-4 bg-card text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors text-lg shadow-xl"
            >
              Skapa byråkonto gratis →
            </Link>
            <a
              href="mailto:enterprise@endoo.se"
              className="w-full sm:w-auto px-9 py-4 border border-white/30 text-white font-semibold rounded-2xl hover:bg-card/10 transition-colors text-lg"
            >
              Prata med Enterprise-teamet
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border bg-muted py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-semibold text-muted-foreground hover:text-foreground">endoo.se</Link>
            <span>·</span>
            <Link href="/funktioner" className="hover:text-muted-foreground">Funktioner</Link>
            <span>·</span>
            <Link href="/artiklar" className="hover:text-muted-foreground">Artiklar</Link>
            <span>·</span>
            <Link href="/artiklar/ekonomisystem-byra" className="hover:text-muted-foreground">Ekonomisystem för byråer</Link>
          </div>
          <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
        </div>
      </footer>

    </main>
  )
}
