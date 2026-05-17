import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är BAS-kontoplanen? | Endoo",
  description:
    "En tydlig förklaring av den svenska BAS-kontoplanen — dess historia, struktur och hur du använder den i den löpande bokföringen.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-bas-kontoplan" },
}

export default function VadArBasKontoplanPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black leading-none">E</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">endoo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/funktioner" className="hover:text-gray-900 transition-colors">Funktioner</Link>
            <Link href="/byra" className="hover:text-gray-900 transition-colors">För byråer</Link>
            <Link href="/artiklar" className="hover:text-gray-900 transition-colors">Artiklar</Link>
            <a href="/#priser" className="hover:text-gray-900 transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Kom igång gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Article hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-6 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <Link href="/artiklar" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">← Alla artiklar</Link>
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Bokföring</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Vad är BAS-kontoplanen?</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            BAS-kontoplanen är Sveriges standardiserade kontoplan för bokföring. Den används av de allra flesta svenska företag och utgör grunden för hur affärshändelser registreras och rapporteras.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad är en kontoplan?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          En kontoplan är en förteckning över alla konton som ett företag använder i sin bokföring. Varje ekonomisk händelse — en betalning, en faktura, ett löneuttag — bokförs mot ett eller flera konton i kontoplanen. Kontona är numrerade och grupperade efter typ, vilket gör det möjligt att automatiskt summera och rapportera ekonomisk information.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          I Sverige används BAS-kontoplanen som gemensam standard. Det innebär att ett konto med nummer 1930 alltid avser &quot;Företagskonto / checkräkningskonto&quot; oavsett om du använder Endoo, Fortnox eller något annat system.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Historik — varför skapades BAS?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          BAS-kontoplanen togs fram på 1970-talet av Svenska Arbetsgivareföreningen (SAF) och Industriförbundet. Målet var att skapa en gemensam standard som förenklade kommunikationen mellan företag, revisorer, banker och myndigheter.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Sedan dess förvaltas kontoplanen av BAS-kontogruppen, som uppdaterar den löpande. Varje år publiceras en ny version — BAS 2024, BAS 2025 — med justeringar för ny skattelagstiftning, redovisningsstandarder och övriga förändringar i det svenska regelverket.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">BAS-kontoplanens struktur</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Kontoplanen är uppdelad i åtta kontoklasser, numrerade 1–8. Varje klass täcker en specifik typ av ekonomisk information:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700">Klass</th>
                <th className="text-left p-3 font-semibold text-gray-700">Innehåll</th>
                <th className="text-left p-3 font-semibold text-gray-700">Exempel</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">1xxx</td>
                <td className="p-3">Tillgångar</td>
                <td className="p-3">Bankkonto, kundfordringar, inventarier</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">2xxx</td>
                <td className="p-3">Eget kapital och skulder</td>
                <td className="p-3">Aktiekapital, leverantörsskulder, moms</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">3xxx</td>
                <td className="p-3">Rörelsens intäkter</td>
                <td className="p-3">Försäljning av varor och tjänster</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">4xxx</td>
                <td className="p-3">Inköp och material</td>
                <td className="p-3">Varuinköp, råmaterial, frakt</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">5xxx</td>
                <td className="p-3">Övriga externa kostnader</td>
                <td className="p-3">Hyra, el, kontorsmaterial, marknadsföring</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">6xxx</td>
                <td className="p-3">Personalkostnader</td>
                <td className="p-3">Löner, sociala avgifter, pensioner</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-mono">7xxx</td>
                <td className="p-3">Avskrivningar och nedskrivningar</td>
                <td className="p-3">Avskrivning inventarier och byggnader</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">8xxx</td>
                <td className="p-3">Finansiella poster och skatt</td>
                <td className="p-3">Ränteintäkter, räntekostnader, bolagsskatt</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Hur används BAS-kontoplanen i praktiken?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          När du skapar en faktura och kunden betalar, registreras det som en kredit på konto 3001 (försäljning av tjänster) och en debet på konto 1930 (bankkontot). Dessa dubbelkonterade poster är grunden i allt bokföringsarbete.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Momskonton</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Momsen hanteras via specifika konton i klass 2: utgående moms (det du tar ut av kunder) bokförs på konto 2610–2640 beroende på momssats, och ingående moms (det du betalar till leverantörer) på konto 2640. Skillnaden är vad du redovisar till Skatteverket.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Standardisering hjälper alla</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Tack vare standardiseringen kan din revisor direkt förstå din bokföring, oavsett vilket system du använder. Det förenklar årsredovisning, revision och eventuella systembyten. En <Link href="/artiklar/vad-ar-sie-fil" className="text-indigo-600 hover:underline">SIE-fil</Link> med BAS-konton är läsbar i alla svenska bokföringssystem.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">BAS 2024 och framåt</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          BAS-kontogruppen uppdaterar kontoplanen löpande. BAS 2024 innehåller bland annat justeringar kopplade till nya K2- och K3-reglerna för årsredovisning samt förtydliganden kring digitala tillgångar. Endoo håller alltid sin kontoplan uppdaterad i linje med senaste BAS-version.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Visste du?</p>
          <p className="text-[14px] text-blue-700">
            Du behöver inte använda alla konton i BAS-kontoplanen. Välj de konton som är relevanta för din verksamhet. Endoo föreslår automatiskt rätt konton baserat på transaktionstyp — och du kan alltid justera.
          </p>
        </div>

        {/* CTA box */}
        <div className="mt-16 bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">Prova Endoo gratis</h2>
          <p className="text-gray-600 mb-6">Kom igång på 2 minuter. Inget kreditkort.</p>
          <Link href="/register" className="inline-block px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
            Skapa konto gratis →
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-10 px-6 text-center text-xs text-gray-400">
        <Link href="/" className="font-semibold text-gray-600 hover:text-gray-900">endoo.se</Link>
        {" · "}
        <Link href="/artiklar" className="hover:text-gray-600">Artiklar</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-gray-600">Integritetspolicy</Link>
        {" · © "}{new Date().getFullYear()} Endoo
      </footer>
    </main>
  )
}
