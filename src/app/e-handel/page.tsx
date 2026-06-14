import Link from "next/link"
import type { Metadata } from "next"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Endoo för e-handel – Fakturering, lager och bokföring",
  description:
    "Endoo ger e-handelsföretag ett komplett system för fakturering, lagerhantering och bokföring. Automatisk kontering, realtidslager och SIE-export.",
  alternates: { canonical: "https://endoo.se/e-handel" },
}

const FEATURES = [
  { icon: "▣", title: "Realtidslager", desc: "Spåra lagersaldo per artikel med rörligt genomsnittspris. Påminnelse vid lågt lager. Append-only transaktionslogg som aldrig ljuger." },
  { icon: "◧", title: "Fakturering mot företag", desc: "B2B-fakturering med moms, kreditnotor och betalningsuppföljning. Skicka PDF direkt via e-post." },
  { icon: "◉", title: "Produktregister", desc: "Håll SKU, pris, momssats och enhet per produkt. Koppla produkter till lagerartiklar och fakturarader." },
  { icon: "▤", title: "Automatisk bokföring", desc: "Försäljning och inköp bokförs på rätt konton automatiskt. Rörelsekostnader, lagervärde och intäkter alltid i balans." },
  { icon: "◨", title: "Leverantörsfakturor", desc: "Ladda upp leverantörsfakturor, låt AI extrahera data och bokför med ett klick. Koppla till lagerinköp." },
  { icon: "⬡", title: "API & integrationer", desc: "Koppla ditt webshop-system (WooCommerce, Shopify, m.fl.) via REST API. Hämta lagerstatus och skapa fakturor programmatiskt." },
]

const INVENTORY_STEPS = [
  { n: "01", title: "Skapa lagerartikel", desc: "Koppla en produkt i produktregistret till en lagerartikel med enhet och beställningspunkt." },
  { n: "02", title: "Registrera inköp", desc: "Bokför inköpet — lagervärdet ökar automatiskt och kostnad per enhet beräknas som rörligt genomsnitt." },
  { n: "03", title: "Försäljning minskar saldo", desc: "När du fakturerar dras sålda enheter från lagret. Lagervärdet minskar med genomsnittspriset." },
  { n: "04", title: "Inventering", desc: "Stäm av med verkligt antal. Systemet skapar en justeringstransaktion — aldrig manuell radering." },
]

export default function EHandelPage() {
  return (
    <main className="min-h-screen bg-card text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">E</span>
            </div>
            <span className="text-lg font-extrabold text-foreground">endoo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-muted-foreground hover:text-foreground">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">Kom igång gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-6 bg-gradient-to-br from-indigo-50/30 via-white to-violet-50/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-8 shadow-sm">
            För e-handel & produktbolag
          </div>
          <h1 className="text-5xl font-black text-foreground leading-tight mb-6">
            Lager, fakturering och<br />
            <span className="text-indigo-600">bokföring i ett system.</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Endoo kopplar ihop ditt produktregister, lager och bokföring — så att inköp, försäljning och lagervärde alltid stämmer utan manuellt arbete.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-lg shadow-lg shadow-indigo-200">
              Kom igång gratis →
            </Link>
            <Link href="/#api" className="px-8 py-4 border border text-foreground font-semibold rounded-2xl hover:bg-muted text-lg">
              Se API-dokumentation
            </Link>
          </div>
        </div>
      </section>

      {/* Inventory flow */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-white text-center mb-4">Hur lagerhanteringen fungerar</h2>
          <p className="text-muted-foreground text-center mb-16">Append-only ledger — varje rörelse spåras, inget raderas.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {INVENTORY_STEPS.map(s => (
              <div key={s.n} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <p className="text-indigo-400 font-mono text-sm font-bold mb-3">{s.n}</p>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-foreground text-center mb-16">Allt för ditt e-handelsbolag</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-7 rounded-2xl border border hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all">
                <div className="text-2xl text-indigo-600 mb-4">{f.icon}</div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Klar att koppla ihop ditt lager med bokföringen?</h2>
          <p className="text-indigo-200 mb-8">Starta gratis, inget kreditkort.</p>
          <Link href="/register" className="inline-block px-8 py-4 bg-card text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 text-lg">
            Kom igång gratis →
          </Link>
        </div>
      </section>

      <footer className="border-t border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/" className="font-bold text-foreground hover:text-indigo-600">← Tillbaka till endoo.se</Link>
          <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
        </div>
        <div className="mt-4 flex justify-center md:justify-end">
          <VibeCreditLine />
        </div>
      </footer>
    </main>
  )
}
