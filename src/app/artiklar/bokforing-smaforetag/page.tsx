import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Bokföring för småföretagare — en praktisk guide | Endoo",
  description:
    "Allt du behöver veta om bokföring som småföretagare: löpande bokföring, momskrav, bokslut och när du bör anlita hjälp kontra sköta det själv.",
  alternates: { canonical: "https://endoo.se/artiklar/bokforing-smaforetag" },
}

export default function BokforingSmaforetagPage() {
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
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Guider</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Bokföring för småföretagare — en praktisk guide</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Bokföring behöver inte vara krångligt. Den här guiden ger dig en praktisk genomgång av vad du faktiskt måste göra — och när det lönar sig att ta hjälp.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Måste alla företag ha bokföring?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Ja — enligt Bokföringslagen (BFL) är alla juridiska personer och enskilda firmor bokföringsskyldiga. Det innebär att du löpande måste registrera alla affärshändelser (inkomster, utgifter, tillgångsförändringar) i ett bokföringssystem.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Enskilda firmor med en nettoomsättning under 3 miljoner kronor kan använda förenklad bokföring (kontantmetoden), men grundregeln är densamma: alla transaktioner ska dokumenteras.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Kontantmetoden vs. fakturametoden</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Det finns två grundläggande sätt att bokföra:
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Kontantmetoden (kassabaserad)</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Du bokför när pengar faktiskt betalas in eller ut. Skickar du en faktura i januari som betalas i februari? Då bokförs intäkten i februari. Metoden är enklare och passar bäst för enskilda firmor med liten omsättning.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Fakturametoden (periodiserad)</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Du bokför när fakturan utfärdas eller tas emot, oavsett när betalningen sker. Den faktura du skickade i januari bokförs som en januariintäkt. Metoden ger en mer rättvisande bild av verksamheten och är obligatorisk för aktiebolag.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad ska du bokföra?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Som tumregel ska du bokföra allt som påverkar ditt företags ekonomi:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li>Kundfakturor och inbetalningar</li>
          <li>Leverantörsfakturor och utbetalningar</li>
          <li>Löner och arbetsgivaravgifter</li>
          <li>Bankavgifter och räntor</li>
          <li>Kvitton för företagsutlägg (fika, resor, kontorsmaterial)</li>
          <li>Inventarieköp och avskrivningar</li>
          <li>Momsinbetalningar och skatteåterbetalningar</li>
        </ul>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Moms — vad gäller?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Momsregistrering</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Om din omsättning överstiger 80 000 kronor per år måste du momsregistrera dig hos Skatteverket. Du lägger då på moms (25 %, 12 % eller 6 % beroende på tjänst/vara) på dina fakturor och redovisar nettomomsen till Skatteverket.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Momsperioder</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          De flesta småföretag rapporterar moms kvartalsvis. Omsätter du över 40 miljoner kronor redovisar du månadsvis. Momsdeklarationen lämnas in och betalas via Skatteverkets e-tjänst, vanligtvis den 12:e i månaden efter kvartalets slut.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Ingående vs. utgående moms</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Utgående moms är den moms du tar ut av dina kunder. Ingående moms är den moms du betalar till leverantörer. Du betalar skillnaden till Skatteverket — eller får tillbaka om ingående moms är högre (typiskt vid investeringsperioder).
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Löpande bokföring — praktiska tips</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Boka ofta</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Avsätt 30–60 minuter per vecka för att stämma av och bokföra. Det är mycket lättare att hålla ordning löpande än att sitta med en hög med kvitton på nyårsafton.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Spara alla underlag</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Varje verifikation (faktura, kvitto, kontoutdrag) ska sparas i sju år. Digitala kvitton är lika giltiga som papper — ta en bild med telefonen direkt och ladda upp till ditt ekonomisystem.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Håll företagsekonomi och privat isär</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Ha alltid ett separat bankkonto för företaget. Det förenklar bokföringen enormt och minskar risken för blandning av privata och företagsmässiga transaktioner — vilket kan skapa problem vid en revision.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Bokslut och årsredovisning</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Räkenskapsåret avslutas med ett bokslut. För aktiebolag innebär det en årsredovisning som ska lämnas till Bolagsverket senast sju månader efter räkenskapsårets slut. Enskilda firmor upprättar ett förenklat bokslut som underlag för deklarationen.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Bokslutsarbete inkluderar periodiseringar, lagerinventeringar, avskrivningar och eventuella reserveringar. Är du osäker — ta hjälp av en redovisningskonsult för just bokslutet, även om du sköter den löpande bokföringen själv.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Sköta det själv eller anlita hjälp?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Det beror på din situation. Generellt:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li><strong>Gör det själv</strong> om du har enkel verksamhet, få transaktioner och ett bra ekonomisystem. Det ger dig full kontroll och håller kostnaderna nere.</li>
          <li><strong>Ta hjälp</strong> om du har komplex moms (import/export), anställda, fastighetsinnehav eller helt enkelt inte vill lägga tid på det.</li>
          <li><strong>Hybridmodell</strong> — sköt den löpande bokföringen själv och anlita en redovisningskonsult för bokslut och deklaration. Vanligt och kostnadseffektivt.</li>
        </ul>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Läs också</p>
          <p className="text-[14px] text-blue-700">
            Vill du förstå hur AI kan hjälpa dig med bokföringen? Läs{" "}
            <Link href="/artiklar/ai-bokforing" className="underline">Så kan AI hjälpa med bokföring</Link> — och hur Endoo automatiserar det repetitiva arbetet.
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
