import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Vad är ett ekonomisystem? | Endoo",
  description:
    "Lär dig vad ett ekonomisystem är, vad det gör och hur du väljer rätt lösning för ditt företag. Vi jämför moderna och traditionella alternativ.",
  alternates: { canonical: "https://endoo.se/artiklar/vad-ar-ett-ekonomisystem" },
}

export default function VadArEttEkonomisystemPage() {
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
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Grunderna</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Vad är ett ekonomisystem?</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Ett ekonomisystem är programvaran som håller ihop ditt företags hela ekonomi — från fakturor och betalningar till bokföring och rapporter. Här förklarar vi vad det är, vad det gör och hur du väljer rätt.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Definition: vad är ett ekonomisystem?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Ett ekonomisystem — ibland kallat affärssystem, bokföringsprogram eller redovisningssystem — är ett digitalt verktyg som samlar alla ekonomiska flöden i ditt företag på ett ställe. Det ersätter papperskvitton, manuella Excel-ark och spretiga mappar med en strukturerad, automatiserad process.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          I grunden handlar det om att registrera, organisera och rapportera finansiella transaktioner. Men moderna system gör mycket mer än så — de skickar fakturor automatiskt, bokför affärshändelser direkt och ger dig realtidsöversikt över hur företaget mår ekonomiskt.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad gör ett ekonomisystem?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Ett komplett ekonomisystem täcker vanligtvis dessa kärnfunktioner:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li><strong>Fakturering</strong> — Skapa, skicka och följa upp kundfakturor digitalt.</li>
          <li><strong>Bokföring</strong> — Registrera inkomster och utgifter mot rätt konton enligt BAS-kontoplanen.</li>
          <li><strong>Momshantering</strong> — Beräkna och rapportera moms (ingående och utgående) korrekt.</li>
          <li><strong>Leverantörsfakturor</strong> — Ta emot, granska och betala inkommande fakturor.</li>
          <li><strong>Rapporter</strong> — Generera balansrapport, resultatrapport och andra ekonomiska sammanställningar.</li>
          <li><strong>Kundreskontra och leverantörsreskontra</strong> — Håll koll på vad kunder är skyldiga dig och vad du är skyldig leverantörer.</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Moderna plattformar som Endoo lägger dessutom till AI-assisterade funktioner, avtalsfakturering, byråhantering och realtidsöversikter som gör att du sällan behöver logga in hos Skatteverket manuellt.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Varför behöver ditt företag ett ekonomisystem?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          I Sverige är löpande bokföring ett lagkrav för alla aktiebolag, handelsbolag och enskilda firmor med en omsättning över 3 miljoner kronor. Men lagkravet är bara en av många anledningar att ha ordning på ekonomin.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Spara tid</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Manuell bokföring i Excel tar timmar varje månad. Ett ekonomisystem automatiserar återkommande moment — fakturor skickas vid rätt datum, moms summeras automatiskt och rapporter genereras med ett klick.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Undvika misstag</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Felaktig momsredovisning, dubbelbokade betalningar och försenade fakturor kostar pengar. Systemet håller ordning och flaggar avvikelser innan de blir problem.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">Bättre beslutsunderlag</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Med en <Link href="/artiklar/vad-ar-resultatrapport" className="text-indigo-600 hover:underline">resultatrapport</Link> och <Link href="/artiklar/vad-ar-balansrapport" className="text-indigo-600 hover:underline">balansrapport</Link> tillgängliga i realtid kan du fatta välgrundade beslut om investeringar, anställningar och prissättning.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Ekonomisystem vs. Excel — vad är skillnaden?</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Många småföretagare börjar med Excel. Det fungerar till en viss punkt, men det finns fundamentala brister:
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700">Funktion</th>
                <th className="text-left p-3 font-semibold text-gray-700">Excel</th>
                <th className="text-left p-3 font-semibold text-gray-700">Ekonomisystem</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="p-3">Fakturering</td>
                <td className="p-3">Manuell</td>
                <td className="p-3">Automatiserad</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3">Momsberäkning</td>
                <td className="p-3">Manuell formel</td>
                <td className="p-3">Inbyggd och korrekt</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3">Revision</td>
                <td className="p-3">Svårt</td>
                <td className="p-3">SIE-export med ett klick</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3">Skalbarhet</td>
                <td className="p-3">Begränsad</td>
                <td className="p-3">Obegränsad</td>
              </tr>
              <tr>
                <td className="p-3">Samarbete</td>
                <td className="p-3">Kräver delning av filer</td>
                <td className="p-3">Inbyggt, rollbaserat</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Gamla system vs. moderna alternativ</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Under många år dominerade Fortnox och Visma den svenska marknaden. De är robusta och heltäckande, men har också sina begränsningar: komplexa gränssnitt, höga priser, långa inlärningstider och begränsad modern integration.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Moderna alternativ som Endoo är byggda från grunden för att vara enkla att använda — utan att kompromissa med funktionalitet. De erbjuder:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-[15px] mb-6 ml-4">
          <li>Rent, intuitivt gränssnitt utan onödig komplexitet</li>
          <li>AI-assistans för bokföring och analys</li>
          <li>Byråläge för redovisningsbyråer som hanterar flera klienter</li>
          <li>Transparent och förutsägbar prissättning</li>
          <li>Snabb implementation — kom igång på minuter, inte veckor</li>
        </ul>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad ska du titta efter när du väljer?</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">1. Täcker det dina behov?</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Behöver du bara skicka fakturor, eller vill du ha komplett bokföring? Vill du ha <Link href="/artiklar/avtalsfakturering" className="text-indigo-600 hover:underline">avtalsfakturering</Link> för återkommande kunder? Lista dina viktigaste behov innan du väljer.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">2. Är det enkelt att använda?</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Det bästa systemet är det du faktiskt använder. Testa gratisversionen och se om du kan skapa en faktura på fem minuter utan att läsa en manual.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">3. Kan det växa med dig?</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Välj ett system som hanterar fler kunder, fler transaktioner och fler anställda utan att du behöver byta om ett år.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">4. Stödjer det SIE-export?</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          <Link href="/artiklar/vad-ar-sie-fil" className="text-indigo-600 hover:underline">SIE-filer</Link> är standard i Sverige och krävs av revisorer och vid systembyten. Se till att ditt system kan exportera dessa.
        </p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">5. Vad kostar det?</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">
          Jämför totalkosten — licens, eventuella tillägg och den tid systemet sparar dig. Billigast är inte alltid bäst, men dyrt är inte heller automatiskt bättre.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Läs också</p>
          <p className="text-[14px] text-blue-700">
            Vill du förstå de vanligaste rapporterna? Läs om{" "}
            <Link href="/artiklar/vad-ar-balansrapport" className="underline">balansrapporten</Link> och{" "}
            <Link href="/artiklar/vad-ar-resultatrapport" className="underline">resultatrapporten</Link> — de två viktigaste finansiella rapporterna i ditt företag.
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
