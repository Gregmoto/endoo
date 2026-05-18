import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är en SIE-fil? | Endoo",
  description:
    "SIE är den svenska standarden för att exportera bokföringsdata. Lär dig om SIE-typerna 1–5, när du behöver dem och hur du exporterar från Endoo.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-sie-fil" },
}

export default function VadArSieFilPage() {
  return (
    <main className="min-h-screen bg-card">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black leading-none">E</span>
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">endoo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/funktioner" className="hover:text-foreground transition-colors">Funktioner</Link>
            <Link href="/byra" className="hover:text-foreground transition-colors">För byråer</Link>
            <Link href="/artiklar" className="hover:text-foreground transition-colors">Artiklar</Link>
            <a href="/#priser" className="hover:text-foreground transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Kom igång gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Article hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-6 border-b border">
        <div className="max-w-3xl mx-auto">
          <Link href="/artiklar" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">← Alla artiklar</Link>
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Bokföring</div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-5">Vad är en SIE-fil?</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            SIE-filen är en svensk standard för att exportera och flytta bokföringsdata mellan system. Den används av revisorer, vid systembyten och när du kommunicerar med Skatteverket.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Vad är SIE?</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          SIE står för <em>Standard Import Export</em> och är ett filformat som togs fram av dåvarande Bokföringsnämnden (BFN) tillsammans med branschen. Det är ett textbaserat format — i grunden en vanlig textfil — som innehåller strukturerad bokföringsinformation enligt en definierad standard.
        </p>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          SIE är idag en de facto-standard i Sverige. Praktiskt taget alla svenska bokföringsprogram kan exportera och importera SIE-filer, vilket gör det enkelt att dela data med revisorer, byta system eller arkivera bokföringen.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">De fem SIE-typerna</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Det finns fem varianter av SIE-filer, numrerade 1 till 5, med olika innehåll och användningsområden:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="bg-muted border-b border">
                <th className="text-left p-3 font-semibold text-foreground">Typ</th>
                <th className="text-left p-3 font-semibold text-foreground">Innehåll</th>
                <th className="text-left p-3 font-semibold text-foreground">Vanligast för</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border">
                <td className="p-3 font-semibold">SIE 1</td>
                <td className="p-3">Årets saldon per konto</td>
                <td className="p-3">Enkel statistik och analys</td>
              </tr>
              <tr className="border-b border">
                <td className="p-3 font-semibold">SIE 2</td>
                <td className="p-3">Periodsaldon per konto</td>
                <td className="p-3">Månadsvis uppföljning</td>
              </tr>
              <tr className="border-b border">
                <td className="p-3 font-semibold">SIE 3</td>
                <td className="p-3">Periodsaldon med ingående balans</td>
                <td className="p-3">Mer detaljerad periodanalys</td>
              </tr>
              <tr className="border-b border">
                <td className="p-3 font-semibold">SIE 4</td>
                <td className="p-3">Verifikationsnivå — alla transaktioner</td>
                <td className="p-3">Revision, systembyten, arkivering</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">SIE 5</td>
                <td className="p-3">XML-baserat format</td>
                <td className="p-3">Myndighetsrapportering (används sällan)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          I praktiken är <strong>SIE 4</strong> den absolut vanligaste typen. Den innehåller alla verifikationer med konteringsrader, vilket gör det möjligt att rekonstruera hela bokföringen i ett annat system.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">När behöver du en SIE-fil?</h2>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Vid revision</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Din revisor behöver ofta en SIE 4-fil för att granska bokföringen. De flesta revisorer föredrar att importera filen i sitt eget analysprogram (t.ex. CaseWare eller IDEA) snarare än att logga in i ditt bokföringssystem.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Vid systembyte</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Byter du från ett bokföringsprogram till ett annat? Exportera en SIE 4-fil från det gamla systemet och importera den i det nya. Historiska transaktioner följer med, och du slipper börja om från noll.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Arkivering</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Enligt bokföringslagen ska räkenskapsinformation bevaras i sju år. En SIE 4-fil är ett säkert och kompakt sätt att arkivera ett helt räkenskapsår i ett enda textdokument.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Kommunikation med redovisningsbyrå</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Om din <Link href="/artiklar/ekonomisystem-byra" className="text-indigo-600 hover:underline">redovisningsbyrå</Link> använder ett annat system än du kan SIE-filen fungera som brygga. Exporten tar sekunder och byrån kan direkt importera och granska data.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Hur exporterar du en SIE-fil från Endoo?</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          I Endoo är SIE-export inbyggt och tar bara några sekunder:
        </p>
        <ul className="list-disc list-inside space-y-2 text-foreground text-[15px] mb-6 ml-4">
          <li>Gå till <strong>Bokföring → Rapporter → SIE-export</strong></li>
          <li>Välj räkenskapsår och SIE-typ (vanligtvis SIE 4)</li>
          <li>Klicka Exportera — filen laddas ner direkt till din dator</li>
        </ul>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Filen innehåller information om kontoplanen (<Link href="/artiklar/vad-ar-bas-kontoplan" className="text-indigo-600 hover:underline">BAS-kontona</Link>), ingående balanser, alla verifikationer under perioden och utgående saldon.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Tips</p>
          <p className="text-[14px] text-blue-700">
            Exportera en SIE 4-fil i slutet av varje räkenskapsår som en del av din årsrutin — oavsett om du behöver den just nu. Det är din säkerhetskopia av hela bokföringen.
          </p>
        </div>

        {/* CTA box */}
        <div className="mt-16 bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black text-foreground mb-3">Prova Endoo gratis</h2>
          <p className="text-muted-foreground mb-6">Kom igång på 2 minuter. Inget kreditkort.</p>
          <Link href="/register" className="inline-block px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
            Skapa konto gratis →
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border bg-muted py-10 px-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="font-semibold text-muted-foreground hover:text-foreground">endoo.se</Link>
        {" · "}
        <Link href="/artiklar" className="hover:text-muted-foreground">Artiklar</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-muted-foreground">Integritetspolicy</Link>
        {" · © "}{new Date().getFullYear()} Endoo
      </footer>
    </main>
  )
}
