import type { Metadata } from "next"
import Link from "next/link"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Artiklar om ekonomi och bokföring | Endoo",
  description:
    "Guider, förklaringar och tips för dig som driver företag. Lär dig om bokföring, fakturering, rapporter och moderna ekonomisystem.",
  alternates: { canonical: "https://endoo.se/artiklar" },
}

const articles = [
  {
    slug: "vad-ar-ett-ekonomisystem",
    category: "Grunderna",
    title: "Vad är ett ekonomisystem?",
    description:
      "En genomgång av vad ett modernt ekonomisystem gör, varför du behöver ett och hur du väljer rätt.",
  },
  {
    slug: "bokforing-smaforetag",
    category: "Guider",
    title: "Bokföring för småföretagare — en praktisk guide",
    description:
      "Allt du behöver veta om bokföring som småföretagare: löpande bokföring, moms, bokslut och när du bör ta hjälp.",
  },
  {
    slug: "digital-fakturering",
    category: "Fakturering",
    title: "Så fungerar digital fakturering",
    description:
      "Lär dig reglerna kring fakturering i Sverige, hur du skapar och skickar fakturor digitalt och hur du hanterar påminnelser.",
  },
  {
    slug: "avtalsfakturering",
    category: "Fakturering",
    title: "Så fungerar avtalsfakturering",
    description:
      "Avtalsfakturering automatiserar återkommande fakturor — perfekt för månadsabonnemang, retainers och SLA-avtal.",
  },
  {
    slug: "vad-ar-bas-kontoplan",
    category: "Bokföring",
    title: "Vad är BAS-kontoplanen?",
    description:
      "En förklaring av den svenska BAS-kontoplanen, dess struktur och hur den används i praktiken.",
  },
  {
    slug: "vad-ar-sie-fil",
    category: "Bokföring",
    title: "Vad är en SIE-fil?",
    description:
      "SIE-filer är Sveriges standard för att exportera bokföringsdata. Lär dig vad de innehåller och när du behöver dem.",
  },
  {
    slug: "vad-ar-huvudbok",
    category: "Bokföring",
    title: "Vad är en huvudbok?",
    description:
      "Huvudboken är kärnan i din bokföring. Lär dig vad den visar, hur du läser den och hur den skiljer sig från verifikatslistan.",
  },
  {
    slug: "vad-ar-balansrapport",
    category: "Rapporter",
    title: "Vad är en balansrapport?",
    description:
      "Balansrapporten visar företagets ekonomiska ställning. Lär dig läsa den och förstå tillgångar, skulder och eget kapital.",
  },
  {
    slug: "vad-ar-resultatrapport",
    category: "Rapporter",
    title: "Vad är en resultatrapport?",
    description:
      "Resultatrapporten visar om ditt företag går med vinst eller förlust. Lär dig tolka intäkter, kostnader och rörelseresultat.",
  },
  {
    slug: "ai-bokforing",
    category: "AI",
    title: "Så kan AI hjälpa med bokföring",
    description:
      "AI kan läsa leverantörsfakturor, föreslå konton, verifiera moms och svara på frågor om din ekonomi — i realtid.",
  },
  {
    slug: "ekonomisystem-byra",
    category: "Byråer",
    title: "Ekonomisystem för redovisningsbyråer",
    description:
      "Varför redovisningsbyråer behöver specialiserad programvara — och hur Endoo gör det enkelt att hantera flera klienter.",
  },
]

const categoryColors: Record<string, string> = {
  Grunderna: "bg-purple-100 text-purple-700",
  Bokföring: "bg-blue-100 text-blue-700",
  Rapporter: "bg-green-100 text-green-700",
  Fakturering: "bg-orange-100 text-orange-700",
  AI: "bg-pink-100 text-pink-700",
  Guider: "bg-yellow-100 text-yellow-700",
  Byråer: "bg-indigo-100 text-indigo-700",
}

export default function ArtiklarPage() {
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

      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-6 border-b border">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-4">
            Artiklar om ekonomi och bokföring
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Guider, förklaringar och tips för dig som driver företag.
          </p>
        </div>
      </div>

      {/* Article grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/artiklar/${article.slug}`}
              className="group block bg-card border border rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
            >
              <span
                className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${categoryColors[article.category] ?? "bg-muted text-muted-foreground"}`}
              >
                {article.category}
              </span>
              <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                {article.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{article.description}</p>
              <span className="mt-4 inline-block text-xs font-semibold text-indigo-600 group-hover:underline">
                Läs artikeln →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black text-foreground mb-3">Prova Endoo gratis</h2>
          <p className="text-muted-foreground mb-6">Kom igång på 2 minuter. Inget kreditkort.</p>
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Skapa konto gratis →
          </Link>
        </div>
      </section>

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
