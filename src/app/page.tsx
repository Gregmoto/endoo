import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">endoo</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Logga in</Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Kom igång gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wide">
          Nu i beta
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Fakturering som faktiskt<br />
          <span className="text-indigo-600">fungerar för byråer</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Hantera flera kunder från ett ställe. Skicka fakturor, spåra betalningar och håll koll på ekonomin — oavsett om du är frilans eller byrå.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg"
          >
            Skapa konto gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Logga in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="📄"
            title="Professionella fakturor"
            description="Skapa och skicka fakturor på sekunder. Automatisk numrering, momsberäkning och PDF-export."
          />
          <FeatureCard
            icon="🏢"
            title="Multi-klient hantering"
            description="Byta sömlöst mellan klienter. Perfekt för byråer och konsultfirmor med flera uppdragsgivare."
          />
          <FeatureCard
            icon="🔐"
            title="Rollbaserad åtkomst"
            description="Ge teammedlemmar rätt behörighet. Ägare, administratörer, members och läsare."
          />
          <FeatureCard
            icon="💳"
            title="Betalningsuppföljning"
            description="Se exakt vilka fakturor som är betalda, förfallna eller väntande — alltid uppdaterat."
          />
          <FeatureCard
            icon="📊"
            title="Affärsöversikt"
            description="Dashboard med nyckeltal, intäktsutveckling och senaste aktivitet på ett ögonblick."
          />
          <FeatureCard
            icon="🔍"
            title="Aktivitetslogg"
            description="Full spårbarhet på allt som händer i din organisation. Vem gjorde vad och när."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Redo att komma igång?</h2>
          <p className="text-indigo-200 mb-8">Gratis att använda. Inga kreditkort krävs.</p>
          <Link
            href="/register"
            className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Skapa konto nu
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span>© 2026 Endoo</span>
          <span>Byggt i Sverige 🇸🇪</span>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}
