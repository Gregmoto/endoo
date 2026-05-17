import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Endoo för konsulter och frilansare – Fakturering och bokföring",
  description:
    "Endoo ger konsulter och frilansare ett komplett ekonomiverktyg: fakturering, avtalsfakturering, bokföring och momsdeklaration. Kom igång gratis på 2 minuter.",
  alternates: { canonical: "https://endoo.se/konsulter" },
}

const FEATURES = [
  { icon: "◧", title: "Faktura på 30 sekunder", desc: "Fyll i kund, belopp och moms — PDF och e-post sköter sig självt. Professionellt utseende från dag ett." },
  { icon: "↺", title: "Avtalsfakturering", desc: "Har du månadsavtal med kunder? Sätt upp en gång, systemet fakturerar automatiskt. Aldrig missa en faktura igen." },
  { icon: "▤", title: "Bokföring ingår", desc: "Varje faktura och betalning bokförs automatiskt. Du behöver inte förstå kontoplanen — men den finns om du vill." },
  { icon: "◰", title: "Momsdeklaration", desc: "Moms beräknas automatiskt från bokföringen. Lås perioden och exportera i SKV-format när det är dags." },
  { icon: "◱", title: "Rapporter direkt", desc: "Resultaträkning och balansräkning alltid uppdaterade. Se hur det går utan att vänta på revisorn." },
  { icon: "⬡", title: "SIE-export", desc: "Skicka SIE4-filen direkt till din revisor eller bokföringsbyrå. Inget krångel med manuell export." },
]

export default function KonsulterPage() {
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
      <section className="pt-20 pb-24 px-6 bg-gradient-to-b from-indigo-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-8 shadow-sm">
            För konsulter & frilansare
          </div>
          <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6">
            Ekonomin på autopilot.<br />
            <span className="text-indigo-600">Fokusera på jobbet.</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Endoo sköter fakturering, bokföring och moms automatiskt — så att du kan lägga tid på det du är bra på, inte på administration.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-lg shadow-lg shadow-indigo-200">
              Skapa konto gratis →
            </Link>
            <Link href="/#priser" className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 text-lg">
              Se priser
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-400">Inget kreditkort · Kom igång på 2 minuter</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Allt du behöver som konsult</h2>
            <p className="text-lg text-gray-500">Från faktura till deklaration — utan krångel.</p>
          </div>
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

      {/* CTA */}
      <section className="py-20 px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Redo att ta kontrollen?</h2>
          <p className="text-indigo-200 mb-8">Skapa ett gratis konto och skicka din första faktura idag.</p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 text-lg">
            Kom igång gratis →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <Link href="/" className="font-bold text-gray-700 hover:text-indigo-600">← Tillbaka till endoo.se</Link>
          <span>© {new Date().getFullYear()} Endoo · Byggt i Sverige 🇸🇪</span>
        </div>
      </footer>
    </main>
  )
}
