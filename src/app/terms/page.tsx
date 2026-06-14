import Link from "next/link"
import type { Metadata } from "next"
import { VibeCreditLine } from "@/components/marketing/VibeCreditLine"

export const metadata: Metadata = {
  title: "Användarvillkor – Endoo",
  description: "Läs Endoos användarvillkor för tjänsten.",
  alternates: { canonical: "https://endoo.se/terms" },
}

const SECTIONS = [
  {
    title: "1. Tjänsten",
    content: `Endoo är en webbaserad ekonomiplattform som tillhandahålls av Endoo AB. Tjänsten inkluderar fakturering, bokföring, rapporter och relaterade funktioner som beskrivs på endoo.se. Vi förbehåller oss rätten att ändra, lägga till eller ta bort funktioner med rimlig förvarning.`,
  },
  {
    title: "2. Konto och åtkomst",
    content: `Du ansvarar för att hålla dina inloggningsuppgifter hemliga och för all aktivitet som sker under ditt konto. Meddela oss omedelbart vid misstanke om obehörig åtkomst. Du måste vara minst 18 år och ha behörighet att ingå avtal för att använda tjänsten.`,
  },
  {
    title: "3. Betalning och prenumeration",
    content: `Betalda planer faktureras månadsvis via Stripe. Priset anges exklusive moms. Du kan avsluta din prenumeration när som helst — avslutandet gäller från och med nästa faktureringsperiod. Inga återbetalningar ges för påbörjad period.`,
  },
  {
    title: "4. Dina data",
    content: `Du äger all data du lägger in i Endoo. Vi behandlar den uteslutande för att tillhandahålla tjänsten. Du kan när som helst exportera din data (fakturor, bokföring som SIE4-fil). Vi raderar din data 90 dagar efter att kontot stängts, om inget annat avtalats.`,
  },
  {
    title: "5. Acceptabel användning",
    content: `Du får inte använda Endoo för olaglig verksamhet, spama, distribuera skadlig kod eller störa tjänstens drift. Vi förbehåller oss rätten att stänga konton som bryter mot dessa villkor.`,
  },
  {
    title: "6. Tillgänglighet och support",
    content: `Vi strävar efter 99,9% drifttid. Planerade underhållsavbrott meddelas i förväg. Support ges via e-post och svaras normalt inom 1–2 arbetsdagar. Enterprise-kunder kan ha separata SLA-avtal.`,
  },
  {
    title: "7. Ansvarsbegränsning",
    content: `Endoo är ett verktyg — vi ansvarar inte för fel i bokföring eller deklarationer som uppstår på grund av felaktig information inmatad av användaren. Vår sammanlagda skadeståndsskyldighet är begränsad till summan av avgifter betalda under de senaste 12 månaderna.`,
  },
  {
    title: "8. Förändringar i villkor",
    content: `Vi kan uppdatera dessa villkor. Vid väsentliga ändringar informerar vi via e-post minst 30 dagar i förväg. Fortsatt användning efter ikraftträdandedatum innebär acceptans av de nya villkoren.`,
  },
  {
    title: "9. Tillämplig lag",
    content: `Dessa villkor regleras av svensk lag. Tvister avgörs i svensk domstol med Stockholms tingsrätt som första instans.`,
  },
]

export default function TermsPage() {
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
        <h1 className="text-4xl font-black text-foreground mb-3">Användarvillkor</h1>
        <p className="text-sm text-muted-foreground mb-12">Senast uppdaterad: maj 2025 · Gäller från och med registreringsdatum</p>

        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          Genom att skapa ett konto eller använda Endoo accepterar du dessa villkor. Läs igenom dem noggrant.
        </p>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-2xl border border">
          <p className="font-semibold text-foreground mb-1">Frågor om villkoren?</p>
          <p className="text-sm text-muted-foreground">
            Kontakta oss på{" "}
            <a href="mailto:hej@endoo.se" className="text-indigo-600 hover:underline">hej@endoo.se</a>.
          </p>
        </div>
      </article>

      <footer className="border-t border py-8 px-6">
        <div className="max-w-3xl mx-auto flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-muted-foreground">Integritetspolicy</Link>
          <Link href="/cookies" className="hover:text-muted-foreground">Cookies</Link>
        </div>
        <div className="mt-4 flex justify-center md:justify-end">
          <VibeCreditLine />
        </div>
      </footer>
    </main>
  )
}
