import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookiepolicy – Endoo",
  description: "Information om hur Endoo använder cookies.",
  alternates: { canonical: "https://endoo.se/cookies" },
}

const COOKIES = [
  {
    category: "Nödvändiga",
    color:     "bg-green-50 border-green-100 text-green-800",
    desc:      "Krävs för att tjänsten ska fungera. Kan inte avaktiveras.",
    items: [
      { name: "next-auth.session-token", purpose: "Håller dig inloggad", duration: "30 dagar", provider: "Endoo" },
      { name: "next-auth.csrf-token",    purpose: "Skyddar mot CSRF-attacker", duration: "Session", provider: "Endoo" },
    ],
  },
  {
    category: "Funktionella",
    color:     "bg-blue-50 border-blue-100 text-blue-800",
    desc:      "Förbättrar upplevelsen — t.ex. kommer ihåg dina inställningar.",
    items: [
      { name: "endoo-org-pref", purpose: "Senast valda organisation", duration: "90 dagar", provider: "Endoo" },
    ],
  },
  {
    category: "Analytiska",
    color:     "bg-yellow-50 border-yellow-100 text-yellow-800",
    desc:      "Hjälper oss förstå hur tjänsten används så vi kan förbättra den. Anonymiserade.",
    items: [
      { name: "_vercel_insights", purpose: "Anonym sidvisningsstatistik", duration: "1 år", provider: "Vercel" },
    ],
  },
]

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">E</span>
            </div>
            <span className="font-extrabold text-gray-900">endoo</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Tillbaka</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-indigo-600 font-semibold uppercase tracking-widest mb-3">Juridik</p>
        <h1 className="text-4xl font-black text-gray-900 mb-3">Cookiepolicy</h1>
        <p className="text-sm text-gray-400 mb-8">Senast uppdaterad: maj 2025</p>

        <p className="text-lg text-gray-600 leading-relaxed mb-12">
          Endoo använder ett minimalt antal cookies — bara vad som är nödvändigt för att tjänsten ska fungera och för att vi ska kunna förbättra upplevelsen.
        </p>

        <div className="space-y-8">
          {COOKIES.map(cat => (
            <section key={cat.category}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mb-4 ${cat.color}`}>
                {cat.category}
              </div>
              <p className="text-sm text-gray-600 mb-4">{cat.desc}</p>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Cookie</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Syfte</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Livstid</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Leverantör</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map(item => (
                      <tr key={item.name} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-700">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">{item.purpose}</td>
                        <td className="px-4 py-3 text-gray-500">{item.duration}</td>
                        <td className="px-4 py-3 text-gray-500">{item.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="font-semibold text-gray-900 mb-2">Hantera cookies</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Du kan blockera eller ta bort cookies via din webbläsares inställningar. Observera att blockering av nödvändiga cookies innebär att du inte kan logga in i Endoo. Analytiska cookies kan avaktiveras utan att tjänsten påverkas.
          </p>
        </div>
      </article>

      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-3xl mx-auto flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600">Integritetspolicy</Link>
          <Link href="/terms"   className="hover:text-gray-600">Användarvillkor</Link>
        </div>
      </footer>
    </main>
  )
}
