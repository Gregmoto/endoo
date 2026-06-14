import Link from "next/link"
import type { Metadata } from "next"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Integritetspolicy – Endoo",
  description: "Läs om hur Endoo hanterar dina personuppgifter i enlighet med GDPR.",
  alternates: { canonical: "https://endoo.se/privacy" },
}

const SECTIONS = [
  {
    title: "1. Personuppgiftsansvarig",
    content: `Endoo AB är personuppgiftsansvarig för behandlingen av dina personuppgifter. Kontakta oss på hej@endoo.se vid frågor om denna policy eller vår behandling av personuppgifter.`,
  },
  {
    title: "2. Vilka uppgifter samlar vi in?",
    content: `Vi samlar in uppgifter som du själv lämnar: namn, e-postadress, företagsnamn och organisationsnummer vid registrering. Vi samlar även in uppgifter om hur du använder tjänsten (inloggningar, funktioner du använder) samt tekniska uppgifter som IP-adress och webbläsartyp.`,
  },
  {
    title: "3. Varför behandlar vi dina uppgifter?",
    content: `Vi behandlar dina uppgifter för att: (a) tillhandahålla och förbättra tjänsten, (b) hantera ditt konto och fakturering, (c) skicka viktiga meddelanden om tjänsten, (d) uppfylla rättsliga förpliktelser såsom bokföringskrav.`,
  },
  {
    title: "4. Rättslig grund",
    content: `Behandlingen grundar sig på: fullgörande av avtal (när du använder tjänsten), rättslig förpliktelse (t.ex. bokföringslagen) och berättigat intresse (t.ex. säkerhetsloggar och felsökning).`,
  },
  {
    title: "5. Lagring och säkerhet",
    content: `Dina uppgifter lagras på servrar inom EU (Neon DB, Frankfurt). Vi använder kryptering i vila och under transport. Vi behåller uppgifter så länge ditt konto är aktivt plus 7 år för bokföringsdata (krav enligt bokföringslagen).`,
  },
  {
    title: "6. Dina rättigheter",
    content: `Enligt GDPR har du rätt att: begära tillgång till dina uppgifter, begära rättelse eller radering, invända mot behandling, begära begränsning av behandling, dataportabilitet. Kontakta oss på hej@endoo.se för att utöva dina rättigheter. Du har också rätt att klaga till Integritetsskyddsmyndigheten (IMY).`,
  },
  {
    title: "7. Tredjepartsleverantörer",
    content: `Vi använder följande underleverantörer: Vercel (hosting, USA, Standard Contractual Clauses), Neon (databas, EU), Stripe (betalningar, EU), Resend (e-post, USA, SCC). Alla leverantörer är bundna av databehandlingsavtal.`,
  },
  {
    title: "8. Cookies",
    content: `Vi använder session-cookies för inloggning (nödvändiga) och analytiska cookies för att förstå användningen. Se vår cookiepolicy för detaljer.`,
  },
  {
    title: "9. Ändringar",
    content: `Vi kan uppdatera denna policy. Vid väsentliga ändringar informerar vi via e-post eller meddelande i tjänsten minst 30 dagar i förväg.`,
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-card">
      <header className="border-b border py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">E</span>
            </div>
            <span className="font-extrabold text-foreground">endoo</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-indigo-600 font-semibold uppercase tracking-widest mb-3">Juridik</p>
        <h1 className="text-4xl font-black text-foreground mb-3">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground mb-12">Senast uppdaterad: maj 2025</p>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Endoo tar din integritet på allvar. Den här policyn förklarar vilka personuppgifter vi samlar in, varför vi gör det och vilka rättigheter du har.
          </p>

          <div className="space-y-10">
            {SECTIONS.map(s => (
              <section key={s.title}>
                <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed text-sm">{s.content}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="font-semibold text-foreground mb-1">Frågor om din integritet?</p>
            <p className="text-sm text-muted-foreground">
              Kontakta oss på{" "}
              <a href="mailto:hej@endoo.se" className="text-indigo-600 hover:underline">hej@endoo.se</a>
              {" "}— vi svarar inom 72 timmar.
            </p>
          </div>
        </div>
      </article>

      <footer className="border-t border py-8 px-6">
        <div className="max-w-3xl mx-auto flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms"   className="hover:text-muted-foreground">Användarvillkor</Link>
          <Link href="/cookies" className="hover:text-muted-foreground">Cookies</Link>
        </div>
        <div className="mt-4 flex justify-center md:justify-end">
          <VibeCreditLine />
        </div>
      </footer>
    </main>
  )
}
