import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Funktioner – Endoo ekonomiplattform",
  description:
    "Endoos alla moduler i detalj: fakturering, bokföring, leverantörsfakturor, offerter, kundportal, e-signering, lager, API och byråläge. En plattform för hela ekonomin.",
  alternates: { canonical: "https://endoo.se/funktioner" },
  openGraph: {
    title: "Funktioner – Endoo",
    description: "Alla moduler i en plattform. Fakturering, bokföring, AI, offerter, kundportal och mer.",
    url: "https://endoo.se/funktioner",
  },
}

const MODULES = [
  {
    id: "fakturering",
    icon: "◧",
    category: "Kärna",
    title: "Fakturering",
    tagline: "Professionella fakturor. Snabbt skickade.",
    description:
      "Skapa och skicka fakturor direkt från plattformen med automatisk numrering, momsberäkning och PDF-export. Stöd för kreditnotor, delbetalningar och påminnelser.",
    bullets: [
      "Automatisk numrering (INV-YYYY-NNNN)",
      "25%, 12% och 6% moms",
      "PDF med din logotyp och färg",
      "Direktutskick via e-post",
      "Kreditnotor kopplade till originalfaktura",
      "Delbetalningar och betalningsregistrering",
      "Automatisk påminnelse vid förfallodatum",
      "Uppfyller Skatteverkets krav",
    ],
    articleLink: { href: "/artiklar/digital-fakturering", label: "Läs: Så fungerar digital fakturering" },
  },
  {
    id: "avtal",
    icon: "↺",
    category: "Automatisering",
    title: "Avtalsfakturering",
    tagline: "Återkommande fakturering på autopilot.",
    description:
      "Sätt upp prenumerationer och avtal som faktureras månadsvis, kvartalsvis eller årsvis. Systemet genererar fakturan automatiskt och skickar den vid rätt datum.",
    bullets: [
      "Månads-, kvartals- och årsvis fakturering",
      "Priser snapshotas vid avtalsskapande",
      "Duplikatskydd — aldrig dubbla fakturor",
      "Automatisk konvertering från offert",
      "Pausning och avslutning av avtal",
      "Individuellt betalningsvillkor per avtal",
    ],
    articleLink: { href: "/artiklar/avtalsfakturering", label: "Läs: Så fungerar avtalsfakturering" },
  },
  {
    id: "bokforing",
    icon: "▤",
    category: "Bokföring",
    title: "Bokföring",
    tagline: "Komplett dubbelbokhållning. Alltid uppdaterad.",
    description:
      "Endoo har riktig dubbelbokhållning med BAS 2024-kontoplan förinladdad. Bokföringen uppdateras automatiskt vid fakturering, betalning, leverantörsfaktura och kreditnota.",
    bullets: [
      "BAS 2024-kontoplan — klar att använda direkt",
      "Automatisk kontering för alla händelser",
      "Verifikationsserier A, K, L — aldrig glapp",
      "Periodlåsning och räkenskapsårsstängning",
      "Manuella verifikat för avancerade poster",
      "Full revisionsspår för alla transaktioner",
      "SIE4-export för revisor och årsredovisning",
    ],
    articleLink: { href: "/artiklar/vad-ar-bas-kontoplan", label: "Läs: Vad är BAS-kontoplan?" },
  },
  {
    id: "rapporter",
    icon: "◱",
    category: "Rapporter",
    title: "Rapporter",
    tagline: "Realtidsrapporter direkt ur bokföringen.",
    description:
      "Alla finansiella rapporter uppdateras i realtid baserat på din bokföring. Inga manuella beräkningar. Inga uppdateringsfördröjningar.",
    bullets: [
      "Resultaträkning per period eller räkenskapsår",
      "Balansräkning i realtid",
      "Provbalans (trial balance) per konto",
      "Huvudbok per konto med verifikatsdetaljer",
      "Momsdeklarationsunderlag per period",
      "SIE4-export för revisorer och system",
    ],
    articleLink: { href: "/artiklar/vad-ar-balansrapport", label: "Läs: Vad är en balansrapport?" },
  },
  {
    id: "leverantorsfakturor",
    icon: "◨",
    category: "AI + Bokföring",
    title: "Leverantörsfakturor & OCR",
    tagline: "Ladda upp. AI läser. Du godkänner.",
    description:
      "Ladda upp en PDF eller bild av en leverantörsfaktura. AI-läsaren extraherar automatiskt leverantör, belopp, OCR-nummer, förfallodatum och momssats. Du granskar och bokför med ett klick.",
    bullets: [
      "PDF- och bilduppladdning",
      "AI-extraktion av alla fakturafält",
      "Automatiskt konteringsförslag",
      "Dublettkontroll mot tidigare fakturor",
      "Godkännandeflöde med kommentarer",
      "Bokförs automatiskt när godkänd",
    ],
    articleLink: { href: "/artiklar/ai-bokforing", label: "Läs: Så kan AI hjälpa med bokföring" },
  },
  {
    id: "moms",
    icon: "◰",
    category: "Deklaration",
    title: "Momsdeklaration",
    tagline: "Moms beräknad och redo för deklaration.",
    description:
      "Endoo beräknar automatiskt momsunderlaget per period från din bokföring. Lås perioden med en revisionssäker hash och exportera i SKV-format.",
    bullets: [
      "25%, 12% och 6% moms",
      "Månadsvis, kvartalsvis eller årsvis period",
      "Automatisk beräkning av alla momsrutor",
      "Periodlåsning med SHA-256-hash",
      "Exportformat enligt Skatteverkets krav",
      "Spärr mot ändring efter låsning",
    ],
    articleLink: null,
  },
  {
    id: "offerter",
    icon: "◩",
    category: "Offert",
    title: "Offertsystem",
    tagline: "Från offert till faktura. Med ett klick.",
    description:
      "Skapa professionella offerter med radposter, rabatter och villkor. Skicka till kunden som accepterar eller avböjer direkt i webbläsaren. Konvertera till faktura eller avtal automatiskt.",
    bullets: [
      "Professionell offertmall med PDF",
      "Kunden accepterar online via unik länk",
      "Konvertera till faktura med ett klick",
      "Konvertera till löpande avtal",
      "Automatisk statuspårning och påminnelse",
      "Giltighetstid och automatisk utgång",
    ],
    articleLink: { href: "/artiklar/avtalsfakturering", label: "Läs om avtalsfakturering" },
  },
  {
    id: "esignering",
    icon: "✍",
    category: "Dokument",
    title: "E-signering",
    tagline: "Digital signering direkt i plattformen.",
    description:
      "Skicka avtal och dokument för digital signering. Kunden signerar i webbläsaren med e-legitimation eller klicksignatur. Revisionssäkert, juridiskt bindande och arkiverat.",
    bullets: [
      "Digital signering utan tredjepart",
      "Kunden signerar i webbläsaren",
      "Revisionsspår med tidsstämpel",
      "Automatisk arkivering i dokumentportfölj",
      "Påminnelse vid ej signerat",
      "Koppling till offertsystem och avtal",
    ],
    articleLink: null,
  },
  {
    id: "kundportal",
    icon: "◫",
    category: "Portal",
    title: "Kundportal",
    tagline: "Dina kunder ser sina fakturor — utan att fråga dig.",
    description:
      "Varje kontakt i systemet kan bjudas in till en personlig kundportal. De loggar in via magic link (inget lösenord), ser sina fakturor, laddar ner PDF och granskar avtal.",
    bullets: [
      "Inlogg via magic link — inga lösenord",
      "Anpassad med din logotyp och färg",
      "Alla fakturor och PDF-nedladdning",
      "Alla aktiva avtal och offerter",
      "Fungerar utan att du gör något",
      "Tillgänglig på alla enheter",
    ],
    articleLink: null,
  },
  {
    id: "kunder",
    icon: "◈",
    category: "Kärna",
    title: "Kunder & kontakter",
    tagline: "Strukturerat kundregister. Alltid rätt info.",
    description:
      "Strukturerat register för kunder och leverantörer med org-nummer, VAT-nummer, kontaktpersoner och fullständig fakturahistorik. Per-kund inställningar för betalningsvillkor och valuta.",
    bullets: [
      "Kunder och leverantörer i samma register",
      "Org-nummer och VAT-nummer",
      "Kontaktpersoner per kund",
      "Fullständig faktura- och betalningshistorik",
      "Betalningsvillkor per kund",
      "Automatisk adressifyllning vid faktura",
    ],
    articleLink: null,
  },
  {
    id: "lager",
    icon: "▣",
    category: "Lager",
    title: "Lagerhantering",
    tagline: "Realtidslager. Aldrig mer felräkning.",
    description:
      "Spåra lagersaldo i realtid med rörligt genomsnittspris. Inventering, inköp, försäljning och manuella justeringar — append-only ledger som alltid stämmer.",
    bullets: [
      "Realtidssaldo per produkt",
      "Rörligt genomsnittspris (WAC)",
      "Inköps- och försäljningstransaktioner",
      "Inventeringsfunktion med justeringar",
      "Automatisk saldouppdatering vid faktura",
      "Bokföring av lagerrörelse",
    ],
    articleLink: null,
  },
  {
    id: "ai",
    icon: "◉",
    category: "AI",
    title: "AI-assistent",
    tagline: "Fråga på svenska. Få svar ur din data.",
    description:
      "Endoos inbyggda AI-assistent läser din bokföring, fakturor och lagersaldo i realtid och svarar på naturliga frågor. Powered by Claude — inte ett generiskt chatbot.",
    bullets: [
      "Fråga om momsrutan, balansen eller resultat",
      "Realtidsdata — alltid uppdaterad",
      "Granska avvikelser och obalanser",
      "Konteringshjälp för leverantörsfakturor",
      "Streaming-svar utan fördröjning",
      "Lär sig ingenting om ditt företag — datasekretess",
    ],
    articleLink: { href: "/artiklar/ai-bokforing", label: "Läs: Så kan AI hjälpa med bokföring" },
  },
  {
    id: "byralage",
    icon: "▦",
    category: "Byrå",
    title: "Byråläge",
    tagline: "Hantera alla dina kundkonton. Ett login.",
    description:
      "Inbyggt stöd för redovisningsbyråer och konsulter som hanterar flera kunder. Arbeta i kundkontots namn med full spårbarhet och rollbaserad åtkomst.",
    bullets: [
      "Arbeta i kundkontots namn (impersonering)",
      "Full aktivitetslogg per händelse",
      "Rollstyrning per medarbetare och kund",
      "Byråöversikt — alla kunder i en vy",
      "White-label med kundens logotyp och färg",
      "Separata inställningar per kundkonto",
    ],
    articleLink: { href: "/byra", label: "Läs mer om byråläget" },
  },
  {
    id: "api",
    icon: "⬡",
    category: "API",
    title: "API & Integrationer",
    tagline: "Koppla Endoo till din stack.",
    description:
      "REST API med scope-baserade API-nycklar och rate limiting. Cursor-paginerade endpoints för fakturor, kontakter, bokföring och lager. Webhooks och fler integrationer kommer.",
    bullets: [
      "REST API med API-nyckelautentisering",
      "Scope-baserade behörigheter per nyckel",
      "Cursor-paginering och rate limiting",
      "SIE4-export för externa system",
      "Stripe-integration för betalningar",
      "Webhooks — kommer snart",
      "Zapier-integration — kommer snart",
    ],
    articleLink: null,
  },
]

export default function FunktionerPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black leading-none">E</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">endoo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/funktioner" className="text-indigo-600 font-semibold">Funktioner</Link>
            <Link href="/byra"       className="hover:text-gray-900 transition-colors">För byråer</Link>
            <Link href="/artiklar"   className="hover:text-gray-900 transition-colors">Artiklar</Link>
            <a    href="/#priser"    className="hover:text-gray-900 transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Kom igång gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-5">Plattformen</p>
          <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight mb-6">
            Alla funktioner.<br />En plattform.
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Endoo samlar fakturering, bokföring, offerter, kundportal, AI och mer i ett integrerat system. Modulerna pratar med varandra — du behöver inte.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-lg">
              Kom igång gratis →
            </Link>
            <a href="#fakturering" className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:border-gray-300 transition-colors text-lg">
              Utforska modulerna
            </a>
          </div>
        </div>
      </section>

      {/* ── Quick nav ───────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-100 bg-white sticky top-16 z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 py-3 min-w-max">
            {MODULES.map(m => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {m.title}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Module sections ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-24">
        {MODULES.map((m, idx) => (
          <section key={m.id} id={m.id} className="scroll-mt-32">
            <div className={`grid lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>
              <div className={idx % 2 === 1 ? "lg:col-start-2" : ""}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                    {m.category}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 leading-tight">{m.title}</h2>
                <p className="text-lg text-indigo-600 font-semibold mb-5">{m.tagline}</p>
                <p className="text-gray-500 text-base leading-relaxed mb-8">{m.description}</p>
                {m.articleLink && (
                  <Link href={m.articleLink.href} className="text-sm text-indigo-600 hover:underline font-medium">
                    {m.articleLink.label} →
                  </Link>
                )}
              </div>

              <div className={`bg-gray-50 rounded-2xl border border-gray-100 p-8 ${idx % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}>
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-6">
                  {m.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-5 text-base">Vad ingår</h3>
                <ul className="space-y-3">
                  {m.bullets.map(b => (
                    <li key={b} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs flex-shrink-0 mt-0.5">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-5">Redo att testa?</h2>
          <p className="text-indigo-200 text-lg mb-10">
            Kom igång gratis. Inget kreditkort. Alla moduler tillgängliga i testläge.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-9 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors text-lg shadow-xl"
            >
              Skapa konto gratis →
            </Link>
            <a
              href="mailto:hej@endoo.se"
              className="w-full sm:w-auto px-9 py-4 border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors text-lg"
            >
              Boka en demo
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-semibold text-gray-600 hover:text-gray-900">endoo.se</Link>
            <span>·</span>
            <Link href="/byra" className="hover:text-gray-600">För byråer</Link>
            <span>·</span>
            <Link href="/artiklar" className="hover:text-gray-600">Artiklar</Link>
            <span>·</span>
            <a href="/#priser" className="hover:text-gray-600">Priser</a>
          </div>
          <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
        </div>
      </footer>

    </main>
  )
}
