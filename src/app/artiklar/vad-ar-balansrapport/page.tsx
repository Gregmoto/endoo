import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är en balansrapport? | Endoo",
  description:
    "Balansrapporten visar företagets ekonomiska ställning vid en given tidpunkt. Lär dig läsa tillgångar, skulder och eget kapital på svenska.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-balansrapport" },
}

export default function VadArBalansrapportPage() {
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
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Vad är en balansrapport?</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Balansrapporten — eller balansräkningen — är en ögonblicksbild av ditt företags ekonomiska ställning. Den visar vad företaget äger, vad det är skyldig och hur mycket som tillhör ägarna.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad visar en balansrapport?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Till skillnad från <Link href="/artiklar/vad-ar-resultatrapport" className="text-indigo-600 hover:underline">resultatrapporten</Link> som visar vad som hänt under en period visar balansrapporten läget <em>vid ett specifikt datum</em> — vanligtvis sista dagen i en månad eller vid räkenskapsårets slut.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Rapporten är uppdelad i två sidor som alltid ska vara lika stora — därav namnet <em>balans</em>:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li><strong>Tillgångssidan (Aktiva)</strong> — vad företaget äger och har fordringar på</li>
          <li><strong>Skuld- och eget kapitalsidan (Passiva)</strong> — hur tillgångarna är finansierade</li>
        </ul>

        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Den grundläggande ekvationen är: <strong>Tillgångar = Skulder + Eget kapital</strong>
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Tillgångar — vad äger företaget?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Tillgångarna delas in i <strong>anläggningstillgångar</strong> och <strong>omsättningstillgångar</strong>:
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Anläggningstillgångar (långsiktiga)</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li>Maskiner, inventarier och fordon</li>
          <li>Byggnader och mark</li>
          <li>Immateriella tillgångar (patent, varumärken, goodwill)</li>
          <li>Långfristiga finansiella placeringar</li>
        </ul>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Omsättningstillgångar (kortfristiga)</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li>Kassa och bank</li>
          <li>Kundfordringar (fakturor som ännu inte betalts)</li>
          <li>Lager och varulager</li>
          <li>Förutbetalda kostnader och upplupna intäkter</li>
        </ul>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Skulder och eget kapital — hur är det finansierat?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Eget kapital</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Eget kapital är ägarnas andel av företaget — vad som finns kvar om alla skulder betalas. För ett aktiebolag inkluderar det aktiekapital, reservfonder och årets resultat. Positivt eget kapital är ett tecken på ett ekonomiskt stabilt företag.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Långfristiga skulder</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Skulder med löptid längre än ett år: banklån, checkräkningskredit, obligationer.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Kortfristiga skulder</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Skulder som förfaller inom ett år: leverantörsskulder, moms att betala, skatteskulder, kortfristiga lån och upplupna kostnader.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Hur läser du balansrapporten?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Soliditet</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Soliditet mäter hur stor del av tillgångarna som är finansierade med eget kapital: <strong>Soliditet = Eget kapital / Totala tillgångar × 100</strong>. En soliditet på 30 % eller högre anses generellt vara bra för ett litet eller medelstort företag.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Likviditet</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Likviditet handlar om hur snabbt du kan betala dina skulder. Kassalikviditet = Omsättningstillgångar (exkl. lager) / Kortfristiga skulder. Värde &gt; 1 innebär att du kan betala dina kortfristiga skulder med befintliga tillgångar.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Jämför över tid</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          En balansrapport är mest värdefull när du jämför den med föregående period. Ökar kundfordringarna kraftigt? Kanske är betalningstiderna för långa. Ökar skulderna snabbare än tillgångarna? Det kan vara en signal om likviditetsproblem.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Läs också</p>
          <p className="text-[14px] text-blue-700">
            Balansrapporten visar <em>ställningen</em>, men <Link href="/artiklar/vad-ar-resultatrapport" className="underline">resultatrapporten</Link> visar <em>utvecklingen</em>. Tillsammans ger de en komplett bild av hur ditt företag mår ekonomiskt.
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
