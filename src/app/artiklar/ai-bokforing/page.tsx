import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Så kan AI hjälpa med bokföring | Endoo",
  description:
    "AI kan läsa leverantörsfakturor, föreslå konton, verifiera moms och svara på frågor om din ekonomi i realtid. Lär dig vad AI klarar — och inte klarar.",
  alternates: { canonical: "https://endoo.se/artiklar/ai-bokforing" },
}

export default function AiBokforingPage() {
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
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">AI</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Så kan AI hjälpa med bokföring</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Artificiell intelligens förändrar hur vi hanterar ekonomi. Inte genom att ersätta bokföraren — utan genom att ta bort det tråkiga, repetitiva arbetet och ge dig bättre underlag för beslut.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad kan AI göra inom bokföring idag?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          AI-assisterade funktioner i moderna ekonomisystem är inte längre ett buzzword — de löser konkreta problem som kostar tid och pengar. Här är de viktigaste användningsområdena:
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">OCR och tolkning av leverantörsfakturor</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          OCR (Optical Character Recognition) kombinerat med AI kan läsa en inkommande PDF-faktura och automatiskt extrahera leverantörens namn, fakturanummer, datum, belopp och momsbelopp. Istället för att manuellt mata in dessa uppgifter granskar du bara vad systemet hittat och godkänner med ett klick.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          I Endoo laddar du upp leverantörsfakturan som PDF eller vidarebefordrar e-postkvittot direkt till din inkorgadress. AI:n tolkar dokumentet och skapar ett utkast till verifikation.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Automatiska kontoförslag</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Baserat på leverantörens namn, fakturatexten och historiska bokföringsmönster föreslår AI:n rätt <Link href="/artiklar/vad-ar-bas-kontoplan" className="text-indigo-600 hover:underline">BAS-konton</Link> för varje transaktion. En faktura från ett telekombolag bokas automatiskt mot konto 6210 (telefon och porto). En faktura från ett reklambolag mot 6100 (reklam och PR).
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Med tiden lär sig systemet ditt beteende — om du alltid justerar ett visst konto för en viss leverantör, memorerar AI:n det till nästa gång.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Momsverifiering</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          AI:n kontrollerar automatiskt att momssatsen på en inkommande faktura stämmer med produkttypen. En faktura på hyra ska ha 25 % moms, mat 12 %, trycksaker 6 % — och tjänster för export ska vara momsfria. Avvikelser flaggas direkt.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Ekonomisk assistent</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          En av de kraftfullaste funktionerna är att kunna ställa frågor om din faktiska ekonomi på naturligt språk. Istället för att öppna rapport efter rapport kan du fråga:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li>"Vilka är mina tio största kostnader i år?"</li>
          <li>"Hur ser min bruttomarginal ut jämfört med förra kvartalet?"</li>
          <li>"Vilka fakturor är förfallna och obetalda?"</li>
          <li>"Hur mycket moms behöver jag betala den här månaden?"</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Svaret baseras på din reella bokföringsdata — inte generella råd. Det är en stor skillnad mot att googla eller fråga en chatbot utan kontext.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Avvikelsedetektering</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          AI:n kan övervaka dina transaktioner och flagga ovanliga mönster — en kostnad som är dubbelt så hög som vanligt, en betalning till ett nytt kontonummer, en faktura som ser ut att vara en dubblett. Det är ett extra lager av kontroll mot misstag och fusk.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad kan AI inte göra?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Det är viktigt att vara realistisk om vad AI klarar. AI-baserade system är bra på att identifiera mönster och automatisera repetitiva uppgifter — men de är inte allvetande revisorer:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li><strong>Komplex skatteplanering</strong> — kräver fortfarande mänsklig expertis och kännedom om ditt specifika företag.</li>
          <li><strong>Rättsliga bedömningar</strong> — om en kostnad är avdragsgill i ett specifikt fall behöver en revisor eller skatterådgivare bedöma det.</li>
          <li><strong>Strategiska beslut</strong> — AI kan ge dig underlag, men inte bestämma om du ska investera eller anställa.</li>
          <li><strong>Garanterad korrekthet</strong> — alltid granska AI-förslag, särskilt vid ovanliga transaktioner.</li>
        </ul>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">AI i Endoo</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Endoos AI-funktioner är inbyggda i plattformen och kräver ingen separat konfiguration. De aktiveras automatiskt och arbetar i bakgrunden medan du fokuserar på din verksamhet. Ju mer du använder Endoo, desto bättre blir förslagen — systemet lär sig ditt företags mönster och preferenser löpande.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Visste du?</p>
          <p className="text-[14px] text-blue-700">
            Studier visar att manuell hantering av en leverantörsfaktura tar 8–15 minuter i genomsnitt. Med AI-assisterad hantering kan det reduceras till under 1 minut — en besparing på över 90 % per faktura.
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
