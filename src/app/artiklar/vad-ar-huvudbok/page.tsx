import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är en huvudbok? | Endoo",
  description:
    "Lär dig vad huvudboken är, hur den skiljer sig från verifikatslistan och hur du läser den för att förstå ditt företags ekonomi per konto.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-huvudbok" },
}

export default function VadArHuvudbokPage() {
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
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Vad är en huvudbok?</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Huvudboken är en av de grundläggande rapporterna i all bokföring. Den visar alla transaktioner sorterade per konto och är ovärderlig när du vill förstå varför ett konto har ett visst saldo.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Definition: vad är en huvudbok?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Huvudboken (engelska: <em>General Ledger</em>) är en rapport som visar alla bokförda transaktioner grupperade per konto. För varje konto ser du varje enskild debet- och kreditrad, med datum, verifikationsnummer, beskrivning och löpande saldo.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Tänk på den som en detaljerad historik per konto: om du undrar varför konto 1930 (banken) visar ett visst saldo kan du öppna huvudboken för det kontot och se exakt vilka transaktioner som har påverkat det.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Huvudbok vs. verifikatslista — vad är skillnaden?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Dessa två rapporter innehåller samma grunddata men presenterar den på olika sätt:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700">Rapport</th>
                <th className="text-left p-3 font-semibold text-gray-700">Sorterat efter</th>
                <th className="text-left p-3 font-semibold text-gray-700">Bra för</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="p-3 font-semibold">Huvudbok</td>
                <td className="p-3">Konto → datum</td>
                <td className="p-3">Förstå ett specifikt kontos saldo</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Verifikatslista</td>
                <td className="p-3">Datum → verifikation</td>
                <td className="p-3">Se alla händelser i kronologisk ordning</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Revisorer och ekonomer använder ofta båda — verifikatslistan för att följa händelseförloppet och huvudboken för att djupdyka i specifika konton.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Hur läser du en huvudbok?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          En typisk rad i huvudboken ser ut så här:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 font-mono text-[13px] text-gray-700 overflow-x-auto">
          <div className="grid grid-cols-5 gap-2 font-semibold text-gray-500 mb-2 text-[12px] uppercase tracking-wider">
            <span>Datum</span>
            <span>Ver.nr</span>
            <span>Beskrivning</span>
            <span className="text-right">Debet</span>
            <span className="text-right">Saldo</span>
          </div>
          <div className="grid grid-cols-5 gap-2 border-t border-gray-200 pt-2">
            <span>2024-01-01</span>
            <span>IB</span>
            <span>Ingående balans</span>
            <span className="text-right">—</span>
            <span className="text-right">45 000</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-1">
            <span>2024-01-15</span>
            <span>V1023</span>
            <span>Kund AB faktura</span>
            <span className="text-right">12 500</span>
            <span className="text-right">57 500</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-1">
            <span>2024-01-22</span>
            <span>V1031</span>
            <span>Hyra jan</span>
            <span className="text-right text-red-600">−8 000</span>
            <span className="text-right">49 500</span>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Du ser ingående saldo, sedan varje transaktion med verifikationsnummer och beskrivning, och det löpande saldot efter varje rad. I slutet av perioden syns utgående saldo — det som sedan dyker upp i <Link href="/artiklar/vad-ar-balansrapport" className="text-indigo-600 hover:underline">balansrapporten</Link> eller <Link href="/artiklar/vad-ar-resultatrapport" className="text-indigo-600 hover:underline">resultatrapporten</Link>.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Sambandet med andra rapporter</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Huvudboken är den detaljerade källan bakom sammanfattningsrapporterna:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li><strong>Balansrapporten</strong> summerar saldona för klass 1 och 2 (tillgångar, skulder, eget kapital).</li>
          <li><strong>Resultatrapporten</strong> summerar saldona för klass 3–8 (intäkter och kostnader).</li>
          <li><strong>Råbalansen</strong> (trial balance) visar alla kontons saldon i en enda vy — ett mellansteg mellan huvudboken och de färdiga rapporterna.</li>
        </ul>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">När används huvudboken i praktiken?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Felsökning av avvikelser</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Om ett konto visar ett oväntat saldo är huvudboken din första stop. Bläddra igenom raderna och leta efter felaktiga belopp, dubbelbokningar eller transaktioner som bokförts mot fel konto.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Stämma av bankkontot</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Bankavstämning innebär att du jämför konto 1930 (banken) i huvudboken med ditt faktiska kontoutdrag. Varje rad bör matcha. Differenser indikerar poster som saknas eller bokförts på fel datum.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Revision</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Revisorer granskar ofta specifika konton i huvudboken för att verifiera att transaktioner är korrekt bokförda. En ren och välstrukturerad huvudbok förenklar och påskyndar revisionen.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Tips</p>
          <p className="text-[14px] text-blue-700">
            I Endoo kan du öppna huvudboken för valfritt konto direkt från balansrapporten eller resultatrapporten. Klicka på ett belopp för att se de underliggande transaktionerna.
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
