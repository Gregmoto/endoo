import type { Metadata } from "next"
import Link from "next/link"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Så fungerar avtalsfakturering | Endoo",
  description:
    "Avtalsfakturering automatiserar återkommande fakturor för månadsabonnemang, retainers och SLA-avtal. Lär dig hur du sätter upp det och sparar tid.",
  alternates: { canonical: "https://endoo.se/artiklar/avtalsfakturering" },
}

export default function AvtalsfaktureringPage() {
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
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-5">Så fungerar avtalsfakturering</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Avtalsfakturering innebär att systemet automatiskt skapar och skickar återkommande fakturor enligt ett schema. Perfekt för dig som har månadsabonnemang, retaineravtal eller löpande servicetjänster.
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Vad är avtalsfakturering?</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Avtalsfakturering — ibland kallat prenumerationsfakturering eller återkommande fakturering — är ett sätt att automatisera fakturor som ska skickas regelbundet med samma eller liknande innehåll. Istället för att manuellt skapa en ny faktura varje månad sätter du upp ett avtal en gång och låter systemet sköta resten.
        </p>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Det sparar inte bara tid — det minskar också risken för att du glömmer att fakturera, vilket direkt påverkar likviditeten positivt.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Vanliga användningsområden</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Avtalsfakturering passar för alla typer av återkommande affärsrelationer:
        </p>
        <ul className="list-disc list-inside space-y-2 text-foreground text-[15px] mb-6 ml-4">
          <li><strong>Redovisningsbyråer</strong> — månadsvis ersättning för bokföring och rådgivning</li>
          <li><strong>IT-konsulter och byråer</strong> — retaineravtal för löpande support eller underhåll</li>
          <li><strong>Fastighetsbolag</strong> — hyresfakturor som skickas varje månad</li>
          <li><strong>SaaS-företag</strong> — prenumerationsavgifter till kunder</li>
          <li><strong>Städ- och serviceföretag</strong> — löpande serviceavtal</li>
          <li><strong>Coaching och utbildning</strong> — månadsabonnemang för löpande tjänster</li>
        </ul>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Så sätter du upp avtalsfakturering i Endoo</h2>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Steg 1: Skapa ett avtal</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Gå till Fakturering → Avtal → Nytt avtal. Välj kund, ange faktureringsintervall (månadsvis, kvartalsvis, årsvis), startdatum och om avtalet har ett slutdatum eller löper tillsvidare.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Steg 2: Lägg till avtalsrader</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Lägg till de produkter eller tjänster som ska faktureras. Du kan ha flera rader med olika produkter, kvantiteter och priser. Momssatsen sätts automatiskt baserat på produktkategori.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Steg 3: Välj leveranssätt</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Bestäm om fakturan ska skickas automatiskt via e-post vid skapandet, eller om du vill granska den först innan utskick. De flesta väljer automatisk utskick när avtalet är vältestat.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Steg 4: Aktivera avtalet</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Aktivera avtalet och systemet tar hand om resten. Fakturor skapas på rätt datum, bokförs automatiskt och skickas till kunden — utan att du behöver göra något.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Prisfrysning och indexuppräkning</h2>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Ett vanligt behov är att hålla priset fast under en avtalsperiod — till exempel ett år — och sedan justera det. I Endoo kan du ange ett fast pris som gäller under avtalet, och manuellt uppdatera det vid förlängning. Planerade framtida versioner kommer stödja automatisk KPI-indexuppräkning.
        </p>

        <h2 className="text-2xl font-black text-foreground mt-12 mb-4">Fördelarna med automatisering</h2>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Förutsägbar likviditet</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          När fakturorna skickas i tid, varje gång, jämnas kassaflödet ut. Du vet exakt när pengar kommer in och kan planera utgifter därefter.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Inga glömda fakturor</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Det är lätt att glömma att fakturera när man är mitt i ett uppdrag. Med avtalsfakturering sker det automatiskt, oavsett hur hektiskt det är.
        </p>

        <h3 className="text-lg font-bold text-foreground mt-8 mb-3">Professionellt intryck</h3>
        <p className="text-foreground leading-relaxed mb-4 text-[15px]">
          Kunder som alltid får fakturor på samma datum, med korrekt innehåll och professionell layout, upplever dig som mer strukturerad och pålitlig.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 mt-10">
          <p className="text-[15px] text-blue-800 font-semibold mb-1">Läs också</p>
          <p className="text-[14px] text-blue-700">
            Vill du förstå grunderna för fakturering? Läs vår guide om{" "}
            <Link href="/artiklar/digital-fakturering" className="underline">digital fakturering</Link> — vad en faktura måste innehålla och hur du hanterar påminnelser.
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
