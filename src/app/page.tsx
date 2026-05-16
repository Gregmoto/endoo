import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Endoo – Faktureringssystem för byråer och konsulter",
  alternates: { canonical: "https://endoo.se" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "◧",
    title: "Professionella fakturor på sekunder",
    description:
      "Skapa, skicka och följ upp fakturor med automatisk numrering, momsberäkning och PDF-export. Inga krångliga inställningar.",
  },
  {
    icon: "↺",
    title: "Avtalsfakturering – aldrig missa en faktura",
    description:
      "Sätt upp återkommande fakturering månadsvis, kvartalsvis eller årsvis. Systemet genererar fakturan automatiskt med snapshotade priser.",
  },
  {
    icon: "◈",
    title: "Hantera flera kunder enkelt",
    description:
      "Strukturera alla dina kunder med kontaktpersoner, betalningsvillkor och fakturahistorik på ett ställe.",
  },
  {
    icon: "◎",
    title: "Betalningsuppföljning i realtid",
    description:
      "Se vilka fakturor som är betalda, förfallna eller delbetalda. Registrera betalningar manuellt och håll koll på saldot.",
  },
  {
    icon: "◉",
    title: "Produktregister med momsstöd",
    description:
      "Lägg upp produkter och tjänster med pris, enhet och momssats. Sök och fyll i fakturarader med ett klick.",
  },
  {
    icon: "◫",
    title: "Team och rollstyrning",
    description:
      "Bjud in medarbetare med rätt behörighet. Ägare, administratörer och läsare – granulär kontroll per konto.",
  },
]

const AGENCY_FEATURES = [
  "Arbeta i kundkontots namn",
  "Sätt åtkomstnivå per medarbetare",
  "Full spårbarhet i aktivitetsloggen",
  "Separata inställningar per konto",
]

const PLANS = [
  {
    name: "Gratis",
    price: "0 kr",
    period: "för alltid",
    description: "Perfekt för att komma igång.",
    features: ["1 användare", "10 kontakter", "5 fakturor/mån", "PDF-export"],
    cta: "Kom igång",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "299 kr",
    period: "/månad",
    description: "För frilansare och småföretag.",
    features: ["3 användare", "100 kontakter", "50 fakturor/mån", "E-postutskick", "Avtalsfakturering"],
    cta: "Prova Starter",
    href: "/register?plan=starter",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "799 kr",
    period: "/månad",
    description: "För byråer och växande team.",
    features: ["10 användare", "1 000 kontakter", "500 fakturor/mån", "Byråläge", "Prioriterad support"],
    cta: "Prova Pro",
    href: "/register?plan=pro",
    highlighted: false,
  },
]

const TESTIMONIALS = [
  {
    quote: "Vi hanterar fakturering för 12 kunder och Endoo är det enda system som faktiskt förstår hur byråer jobbar.",
    name: "Anna K.",
    role: "Grundare, digital byrå",
  },
  {
    quote: "Avtalsfaktureringen sparar oss 3–4 timmar i månaden. Det bara tickar på utan att vi behöver tänka på det.",
    name: "Marcus L.",
    role: "Konsult, IT-tjänster",
  },
  {
    quote: "Äntligen ett system på svenska som inte känns som det kom från 2008. Snabbt, enkelt och ser bra ut.",
    name: "Sofia E.",
    role: "Frilans kommunikatör",
  },
]

const FAQS = [
  {
    q: "Kan jag hantera flera kunder med olika inställningar?",
    a: "Ja. Varje konto har sina egna fakturainställningar, kontakter, produkter och historik. Som byrå kan du växla mellan kundkonton utan att logga ut.",
  },
  {
    q: "Fungerar Endoo för svenska moms och regler?",
    a: "Absolut. Endoo hanterar 25%, 12% och 6% moms, stödjer organisationsnummer, bankgiro och korrekt fakturanumrering enligt Skatteverkets krav.",
  },
  {
    q: "Hur fungerar avtalsfakturering?",
    a: "Du skapar ett avtal med intervall (månadsvis, kvartalsvis, årsvis), lägger till rader och sätter ett startdatum. Systemet genererar fakturan automatiskt på rätt datum — med snapshotade priser och duplikatskydd.",
  },
  {
    q: "Kan jag exportera fakturor som PDF?",
    a: "Ja, alla fakturor kan laddas ner som professionell PDF direkt från detaljsidan eller skickas som bilaga via e-post.",
  },
  {
    q: "Vad händer om jag når gränsen för min plan?",
    a: "Du får en tydlig varning när du närmar dig gränsen. Uppgradering sker direkt via Stripe och träder i kraft omedelbart.",
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">endoo</span>
            <span className="hidden sm:inline text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Beta</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#funktioner" className="hover:text-gray-900 transition-colors">Funktioner</a>
            <a href="#byra" className="hover:text-gray-900 transition-colors">För byråer</a>
            <a href="#priser" className="hover:text-gray-900 transition-colors">Priser</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Logga in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Kom igång gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 to-white pt-20 pb-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Nu i beta · Gratis att testa
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Fakturering byggd för<br />
            <span className="text-indigo-600">byråer och konsulter</span>
          </h1>

          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Hantera fakturering för dina kunder från ett enda verktyg. Professionella fakturor, avtalsfakturering, PDF-export och betalningsuppföljning — utan krångel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg shadow-md hover:shadow-lg"
            >
              Skapa konto gratis →
            </Link>
            <a
              href="#priser"
              className="w-full sm:w-auto px-8 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-lg"
            >
              Se priser
            </a>
          </div>

          {/* Social proof */}
          <p className="text-sm text-gray-400">
            Inget kreditkort krävs · Kom igång på under 2 minuter · GDPR-säkert · Byggt i Sverige 🇸🇪
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl -z-10 pointer-events-none" />
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "< 2 min", label: "Tid att skapa din första faktura" },
            { value: "100%",    label: "Momshantering enligt svenska regler" },
            { value: "0 kr",   label: "Att komma igång" },
            { value: "99.9%",  label: "Drifttid (Neon + Vercel)" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-indigo-600 mb-1">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funktioner" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Allt du behöver för smart fakturering</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Från enkel fakturering till avancerad avtalsstyrning — Endoo växer med ditt företag.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="p-7 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-lg font-bold mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency section ── */}
      <section id="byra" className="bg-indigo-600 py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full mb-6 uppercase tracking-wide">
              Byråläge
            </div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-5">
              Byggt för byråer som hanterar flera kunder
            </h2>
            <p className="text-indigo-200 text-lg leading-relaxed mb-8">
              Endoo är unikt i att låta byråer arbeta direkt i kundernas konton — med full spårbarhet och rollstyrning. Du ser allt, kunderna ser bara sitt.
            </p>
            <ul className="space-y-3 mb-8">
              {AGENCY_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-3 text-white">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-block px-7 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Skapa byråkonto gratis →
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 space-y-3">
              {["Kund AB · 3 fakturor", "Webbyrån Norr · 1 förfallen", "Konsult & Co · 5 aktiva avtal", "Startup XYZ · Betald idag ✓"].map(item => (
                <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-white text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Vad våra användare säger</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
                <p className="text-gray-600 leading-relaxed mb-5 text-sm">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="priser" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Enkla priser, inga dolda avgifter</h2>
            <p className="text-lg text-gray-500">Börja gratis. Uppgradera när du växer.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-8 border flex flex-col ${
                  p.highlighted
                    ? "border-indigo-400 shadow-xl shadow-indigo-100 bg-indigo-600 text-white"
                    : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full uppercase tracking-wide">
                    Populärast
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`font-bold text-lg mb-1 ${p.highlighted ? "text-white" : "text-gray-900"}`}>{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-4xl font-extrabold ${p.highlighted ? "text-white" : "text-gray-900"}`}>{p.price}</span>
                    <span className={`text-sm ${p.highlighted ? "text-indigo-200" : "text-gray-400"}`}>{p.period}</span>
                  </div>
                  <p className={`text-sm ${p.highlighted ? "text-indigo-200" : "text-gray-500"}`}>{p.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${p.highlighted ? "text-indigo-100" : "text-gray-600"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${p.highlighted ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.href}
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    p.highlighted
                      ? "bg-white text-indigo-700 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Enterprise-plan? <a href="mailto:hej@endoo.se" className="text-indigo-600 hover:underline">Kontakta oss</a> för skräddarsydda villkor och SLA.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Vanliga frågor</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map(f => (
              <details key={f.q} className="group bg-white rounded-xl border border-gray-100 px-6 py-5 cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-gray-900 list-none">
                  {f.q}
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform text-lg">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-5">
            Redo att ta kontrollen<br />över din fakturering?
          </h2>
          <p className="text-lg text-gray-500 mb-10">
            Skapa ett gratis konto på under 2 minuter. Inget kreditkort. Inga bindningstider.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-lg shadow-lg hover:shadow-xl"
            >
              Skapa konto gratis →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-lg"
            >
              Logga in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div>
              <span className="text-xl font-extrabold text-indigo-600">endoo</span>
              <p className="text-xs text-gray-400 mt-1">Faktureringssystem för moderna byråer</p>
            </div>
            <nav className="flex flex-wrap gap-6 text-sm text-gray-500">
              <a href="#funktioner" className="hover:text-gray-700">Funktioner</a>
              <a href="#byra"       className="hover:text-gray-700">För byråer</a>
              <a href="#priser"     className="hover:text-gray-700">Priser</a>
              <a href="#faq"        className="hover:text-gray-700">FAQ</a>
              <Link href="/login"   className="hover:text-gray-700">Logga in</Link>
              <Link href="/register" className="hover:text-gray-700">Registrera</Link>
            </nav>
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span>© {new Date().getFullYear()} Endoo AB · Fakturerings&shy;system · Byggt i Sverige 🇸🇪</span>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-gray-600">Integritetspolicy</Link>
              <Link href="/terms"   className="hover:text-gray-600">Användarvillkor</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
