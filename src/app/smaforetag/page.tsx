import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Endoo för småföretag – Ekonomisystem utan krångel",
  description:
    "Endoo är ekonomisystemet för småföretag som vill ha fakturering, bokföring och momsdeklaration i ett modernt verktyg. Alternativ till Fortnox och Visma.",
  alternates: { canonical: "https://endoo.se/smaforetag" },
}

const FEATURES = [
  { icon: "◧", title: "Komplett fakturering", desc: "Skapa och skicka professionella fakturor. Hantera kreditnotor, delbetalningar och påminnelser utan extramoduler." },
  { icon: "▤", title: "Bokföring automatiserat", desc: "Fakturor och betalningar bokförs direkt på rätt konton. BAS 2024-kontoplanen är förinladdad och klar." },
  { icon: "◨", title: "Leverantörsfakturor med OCR", desc: "Fotografera eller ladda upp fakturan. AI läser av belopp, moms och OCR-nummer automatiskt." },
  { icon: "◰", title: "Momsdeklaration", desc: "Beräkna och lås momsperioder med ett klick. Exportera i SKV-format direkt till Skatteverket." },
  { icon: "▣", title: "Lagerhantering", desc: "Följ ditt lager i realtid med rörligt genomsnitt. Perfekt för e-handel och produktbolag." },
  { icon: "◱", title: "Rapporter i realtid", desc: "Resultaträkning, balansräkning och provbalans — alltid uppdaterade, ingen manuell sammanställning." },
]

const COMPARE = [
  { feature: "Fakturering",             endoo: true,  fortnox: true  },
  { feature: "Bokföring (BAS 2024)",    endoo: true,  fortnox: true  },
  { feature: "Leverantörsfaktura + OCR", endoo: true, fortnox: "Tillval" },
  { feature: "AI-assistent",            endoo: true,  fortnox: false },
  { feature: "Byråläge",                endoo: true,  fortnox: false },
  { feature: "Modernt gränssnitt",      endoo: true,  fortnox: false },
  { feature: "Öppet API",               endoo: true,  fortnox: "Tillval" },
  { feature: "Pris från",               endoo: "299 kr/mån", fortnox: "399 kr/mån+" },
]

export default function SmaforetagPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">E</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900">endoo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-gray-600 hover:text-gray-900">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">Kom igång gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-full mb-8">
            För småföretag
          </div>
          <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6">
            Ekonomisystemet som<br />
            <span className="text-indigo-600">faktiskt känns modernt.</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Allt ett litet företag behöver — fakturering, bokföring, leverantörsfakturor och momsdeklaration — utan licensmoduler eller dolda avgifter. Äntligen ett alternativ till Fortnox och Visma.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-lg shadow-lg shadow-indigo-200">
              Testa gratis i 14 dagar →
            </Link>
            <Link href="/#priser" className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 text-lg">
              Se priser
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-gray-900 text-center mb-16">Hela ekonomin i ett system</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-7 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all">
                <div className="text-2xl text-indigo-600 mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-black text-gray-900 text-center mb-4">Endoo vs Fortnox</h2>
          <p className="text-center text-gray-500 mb-12">Varför väljer allt fler småföretag Endoo?</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-4 text-left text-gray-500 font-medium">Funktion</th>
                  <th className="px-6 py-4 text-center font-bold text-indigo-700">Endoo</th>
                  <th className="px-6 py-4 text-center text-gray-500 font-medium">Fortnox</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(r => (
                  <tr key={r.feature} className="border-t border-gray-50">
                    <td className="px-6 py-3.5 text-gray-700">{r.feature}</td>
                    <td className="px-6 py-3.5 text-center">
                      {r.endoo === true
                        ? <span className="text-green-600 font-bold">✓</span>
                        : <span className="text-indigo-700 font-semibold text-xs">{r.endoo}</span>
                      }
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {r.fortnox === true
                        ? <span className="text-green-600">✓</span>
                        : r.fortnox === false
                          ? <span className="text-gray-300">✕</span>
                          : <span className="text-gray-400 text-xs">{r.fortnox}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Redo att byta?</h2>
          <p className="text-indigo-200 mb-8">Skapa ett gratis konto idag. Inget kreditkort, inga bindningstider.</p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 text-lg">
            Kom igång gratis →
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <Link href="/" className="font-bold text-gray-700 hover:text-indigo-600">← Tillbaka till endoo.se</Link>
          <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
        </div>
      </footer>
    </main>
  )
}
