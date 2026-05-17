import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är en resultatrapport? | Endoo",
  description:
    "Resultatrapporten visar om ditt företag går med vinst eller förlust. Lär dig läsa intäkter, kostnader, bruttomarginal och rörelseresultat.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-resultatrapport" },
}

export default function VadArResultatrapportPage() {
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
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Rapporter</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Vad är en resultatrapport?</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Resultatrapporten — eller resultaträkningen — visar ditt företags intäkter och kostnader under en period och berättar om verksamheten gick med vinst eller förlust.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad är skillnaden mot balansrapporten?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          <Link href="/artiklar/vad-ar-balansrapport" className="text-indigo-600 hover:underline">Balansrapporten</Link> är en ögonblicksbild — den visar ställningen ett specifikt datum. Resultatrapporten är en film — den visar vad som hänt under en period, till exempel en månad eller ett helt räkenskapsår.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Resultatet (vinst eller förlust) som beräknas i resultatrapporten påverkar eget kapital i balansrapporten. De två rapporterna hänger alltså tätt ihop.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Strukturen i en resultatrapport</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          En typisk resultatrapport följer denna struktur uppifrån och ner:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-[14px]">
          <div className="space-y-2 text-gray-700">
            <div className="flex justify-between font-semibold text-gray-900 pb-2 border-b border-gray-200">
              <span>Nettoomsättning</span>
              <span>850 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Rörelsens kostnader (varor/material)</span>
              <span>−220 000</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
              <span>Bruttovinst</span>
              <span>630 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Övriga externa kostnader (5xxx)</span>
              <span>−180 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Personalkostnader (6xxx)</span>
              <span>−280 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Avskrivningar (7xxx)</span>
              <span>−25 000</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 text-green-700">
              <span>Rörelseresultat (EBIT)</span>
              <span>145 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Finansiella poster (räntor)</span>
              <span>−8 000</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-200 pt-2 text-gray-900">
              <span>Resultat före skatt</span>
              <span>137 000</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Bolagsskatt (20,6 %)</span>
              <span>−28 200</span>
            </div>
            <div className="flex justify-between font-black border-t border-gray-200 pt-2 text-indigo-700">
              <span>Årets resultat</span>
              <span>108 800</span>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Viktiga nyckeltal i resultatrapporten</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Bruttomarginal</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Bruttomarginalen visar hur lönsam din kärnverksamhet är innan overheadkostnader räknas in. <strong>Bruttomarginal = Bruttovinst / Nettoomsättning × 100</strong>. En tjänsteverksamhet har ofta hög bruttomarginal (60–80 %), medan handel kan ha lägre (20–40 %).
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Rörelsemarginal (EBIT-marginal)</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Rörelseresultatet visar lönsamheten från den operativa verksamheten, exklusive finansiella poster och skatt. <strong>Rörelsemarginal = Rörelseresultat / Nettoomsättning × 100</strong>. Det här är det tal banker och investerare tittar på när de bedömer ett företags styrka.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Nettomarginal</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Nettomarginalen är det som faktiskt blir kvar efter alla kostnader och skatt: <strong>Nettomarginal = Årets resultat / Nettoomsättning × 100</strong>. Det är den siffra som förändrar eget kapital i <Link href="/artiklar/vad-ar-balansrapport" className="text-indigo-600 hover:underline">balansrapporten</Link>.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Hur använder du resultatrapporten i praktiken?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Månadsvis uppföljning</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Jämför varje månad med samma månad föregående år. Har omsättningen ökat? Har kostnaderna ökat proportionellt mer? Identifiera tidigt om marginalen kryper nedåt.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Budgetuppföljning</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Ställ faktiska siffror mot din budget. Avvikelser på mer än 10 % bör du undersöka — antingen har något gått bättre/sämre än planerat, eller är budgeten inaktuell.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Prisjusteringar</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Om bruttomarginalen sjunker kan det vara dags att se över prissättningen. Resultatrapporten ger dig de siffror du behöver för att motivera en prisjustering.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Tips</p>
          <p className="text-[14px] text-blue-700">
            I Endoo uppdateras resultatrapporten i realtid varje gång en transaktion bokförs. Du behöver inte vänta till månadsslut för att se hur det går — öppna rapporten när som helst för en aktuell bild.
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
