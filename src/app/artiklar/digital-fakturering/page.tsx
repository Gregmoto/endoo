import type { Metadata } from "next"
import Link from "next/link"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Så fungerar digital fakturering | Endoo",
  description:
    "Lär dig reglerna för fakturering i Sverige, hur du skapar och skickar fakturor digitalt, hanterar påminnelser och kreditnotor.",
  alternates: { canonical: "https://endoo.se/artiklar/digital-fakturering" },
}

export default function DigitalFaktureringPage() {
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
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Fakturering</div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-5">Så fungerar digital fakturering</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Digital fakturering är snabbt, enkelt och i linje med svenska lagkrav. Här går vi igenom vad en faktura måste innehålla, hur du skickar den och hur du följer upp betalningar effektivt.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Vad är en faktura?</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          En faktura är ett formellt krav på betalning för levererade varor eller utförda tjänster. I Sverige regleras fakturering av momslagen (mervärdesskattelagen) och bokföringslagen. Att fakturera korrekt är inte bara god affärssed — det är ett lagkrav för momsregistrerade företag.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Vad måste en faktura innehålla?</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Momslagen ställer krav på vad en faktura måste innehålla för att vara giltig som underlag för momsavdrag. Saknas något av dessa uppgifter kan din kund inte dra av momsen:
        </p>
        <ul className="list-disc list-inside space-y-2 text-foreground text-[15px] mb-6 ml-4">
          <li>Utfärdandedatum</li>
          <li>Löpnummer (unikt per faktura)</li>
          <li>Säljarens namn, adress och organisationsnummer</li>
          <li>Säljarens VAT-nummer (SE + organisationsnummer + 01)</li>
          <li>Köparens namn och adress</li>
          <li>Beskrivning av sålda varor eller utförda tjänster</li>
          <li>Kvantitet, à-pris och totalt belopp exklusive moms</li>
          <li>Momssats (6 %, 12 % eller 25 %) och momsbelopp</li>
          <li>Totalt att betala inklusive moms</li>
          <li>Förfallodatum</li>
        </ul>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">F-skatt</p>
          <p className="text-[14px] text-blue-700">
            Om du är godkänd för F-skatt (F-skattsedel) bör detta framgå på fakturan. Det innebär att du själv betalar dina skatter och att köparen inte behöver göra skatteavdrag på betalningen.
          </p>
        </div>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">E-postfaktura vs. pappersfaktura</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Sedan 2013 är det tillåtet i Sverige att skicka fakturor elektroniskt utan att kräva kundens uttryckliga godkännande — förutsatt att fakturan uppfyller innehållskraven. I praktiken innebär det att du kan skicka en PDF via e-post till alla kunder.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">E-faktura (Peppol)</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          E-faktura i teknisk bemärkelse — vanligtvis via Peppol-nätverket — är ett strukturerat XML-format som tas emot direkt i mottagarens ekonomisystem utan manuell inmatning. Offentlig sektor i Sverige kräver e-faktura via Peppol sedan 2019. Endoo stödjer utskick via Peppol till mottagare som är anslutna.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Betalningstider och villkor</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Vanliga betalningsvillkor i Sverige är 10, 20 eller 30 dagar netto. Enligt lagen om betalningsvillkor (2013:776) får betalningsvillkor mot konsumenter inte överstiga 30 dagar om inte konsumenten uttryckligen accepterat längre tid. Mot företag kan ni avtala om längre villkor.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Dröjsmålsränta</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Vid sen betalning har du rätt att ta ut dröjsmålsränta. Referensräntan sätts av Riksbanken och dröjsmålsräntan är referensräntan + 8 procentenheter. Räntan löper från förfallodatumet om inget annat avtalats.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Påminnelser och inkasso</h2>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Påminnelseavgift</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Du får ta ut en påminnelseavgift på maximalt 60 kronor per påminnelse (mot konsumenter). Mot företag är beloppet fritt att avtala. Skicka en påminnelse när fakturan passerat förfallodatum — vanligtvis 3–7 dagar efter.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Inkasso</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Om betalning uteblir trots påminnelse kan du anlita ett inkassoföretag eller vända dig till Kronofogden med en ansökan om betalningsföreläggande. I Endoo kan du följa upp alla obetalda fakturor i en samlad vy.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Kreditnotor</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          En kreditnota är en negativ faktura — den används för att helt eller delvis häva en tidigare faktura. Det kan bero på returner, priskorrigeringar eller felaktig fakturering. En kreditnota måste referera till den ursprungliga fakturans löpnummer.
        </p>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          I Endoo skapar du kreditnotor med ett klick direkt från den ursprungliga fakturan. Kreditnotan bokförs automatiskt och minskar utestående fordringar.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Läs också</p>
          <p className="text-[14px] text-blue-700">
            Har du återkommande kunder med fasta månadsbelopp? Läs om{" "}
            <Link href="/artiklar/avtalsfakturering" className="underline">avtalsfakturering</Link> och spara timmar varje månad.
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
        <div className="mt-4 flex justify-center">
          <VibeCreditLine />
        </div>
      </footer>
    </main>
  )
}
