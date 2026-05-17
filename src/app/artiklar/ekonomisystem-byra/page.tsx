import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ekonomisystem för redovisningsbyråer | Endoo",
  description:
    "Vad ska ett ekonomisystem klara av när det hanteras av en redovisningsbyrå? Vi går igenom krav, funktioner och vad som skiljer ett byråanpassat system från ett vanligt bokföringsprogram.",
  alternates: { canonical: "https://endoo.se/artiklar/ekonomisystem-byra" },
  openGraph: {
    title: "Ekonomisystem för redovisningsbyråer",
    description: "Krav, funktioner och vad som skiljer ett byråanpassat system från ett vanligt bokföringsprogram.",
    url: "https://endoo.se/artiklar/ekonomisystem-byra",
  },
}

export default function EkonomisystemByraPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black leading-none">E</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">endoo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/funktioner" className="hover:text-gray-900 transition-colors">Funktioner</Link>
            <Link href="/byra"       className="hover:text-gray-900 transition-colors">För byråer</Link>
            <Link href="/artiklar"   className="hover:text-gray-900 transition-colors">Artiklar</Link>
            <a    href="/#priser"    className="hover:text-gray-900 transition-colors">Priser</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-gray-600 hover:text-gray-900">Logga in</Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Kom igång gratis</Link>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-6 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <Link href="/artiklar" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">← Alla artiklar</Link>
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Byråer</div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">Ekonomisystem för redovisningsbyråer</h1>
          <p className="text-xl text-gray-500 leading-relaxed">En redovisningsbyrå har helt andra krav på sitt ekonomisystem än ett enskilt bolag. Här går vi igenom vad som verkligen krävs — och varför standardsystem ofta inte räcker.</p>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Varför ett vanligt bokföringsprogram inte räcker</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">De flesta ekonomisystem är designade för ett enda bolag. Du loggar in, hanterar din fakturering och din bokföring — klart. För en enskild firma eller ett litet aktiebolag fungerar det utmärkt.</p>
        <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">Men en redovisningsbyrå hanterar kanske 20, 50 eller 200 kundkonton. Att logga ut och in i ett nytt konto för varje kund, hålla koll på olika räkenskapsår och momsperioder, och undvika att blanda ihop data — det är en logistisk utmaning som ett standardsystem inte är byggt för att lösa.</p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Vad ett byråanpassat system måste klara</h2>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">1. Hantera flera kunder i ett login</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">Det grundläggande kravet är att byrån kan arbeta i flera kundkonton utan att logga ut och in. Varje konto ska vara helt isolerat — en kunds bokföring, fakturor och inställningar ska aldrig blandas med en annan kunds.</p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">2. Rollbaserad åtkomstkontroll</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">På en byrå arbetar ofta flera medarbetare med samma kunder, men med olika behörighetsnivåer. En juniorassistent kanske ska kunna bokföra men inte radera verifikat. En partner ska ha full tillgång. Systemet måste klara granulär rollstyrning per användare och per kundkonto.</p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">3. Fullständig revisionsspår</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">När byrån arbetar i en kunds namn måste varje åtgärd loggas med information om vem som utförde den och när. Det skyddar både byrån och kunden vid eventuella tvister eller revisioner.</p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">4. SIE-export per kund</h3>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">Byråer behöver regelbundet exportera SIE-filer till revisorer och årsredovisningsbyråer. Systemet ska kunna exportera SIE4 för varje kundkonto separat med rätt räkenskapsår och verifikationsserier.</p>

        <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3">5. White-label och kundanpassning</h3>
        <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">Många byråer vill att deras kunder inte ser att byrån använder ett visst system. White-label-funktioner — kundens logotyp på fakturor, byrån som avsändare på e-post — är ett vanligt krav i professionella byrårelationer.</p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
          <p className="font-semibold text-blue-900 mb-2">Checklista för byråer som väljer ekonomisystem</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
            <li>Kan du hantera obegränsat antal kundkonton?</li>
            <li>Kan du byta kund utan att logga ut?</li>
            <li>Finns rollstyrning per medarbetare och per kund?</li>
            <li>Loggas alla händelser med vem som utförde dem?</li>
            <li>Finns SIE4-export per kund?</li>
            <li>Stöds white-label med kundens varumärke?</li>
            <li>Kan kunden ha en egen kundportal?</li>
          </ul>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Byråöversikt — se alla kunder på ett ställe</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">En funktion som sällan finns i vanliga system men som byråer värdesätter högt är en gemensam byråöversikt. Istället för att gå in i varje kundkonto för att se status kan byrån se alla kunder i en vy — vilka har förfallna fakturor, aktiva avtal, öppen bokföring eller väntande offerter.</p>
        <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">Det sparar tid och minskar risken att något missas. En förfallen faktura hos en kund kan lätt gå obemärkt förbi om du måste logga in separat för att se den.</p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Kundportaler för byråns kunder</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">En modern funktion som byråer börjar efterfråga är möjligheten att ge sina kunder ett eget digitalt fönster mot sina egna uppgifter. En kundportal där kunden kan logga in och se sina fakturor, aktiva avtal och offerter — utan att behöva mejla eller ringa byrån.</p>
        <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">Det minskar onödig administration för byrån och ger kunden en bättre upplevelse. Moderna system erbjuder magic link-inlogg (kunden klickar på en länk i mejlet och är inloggad, inga lösenord) vilket eliminerar supportärenden kring glömda lösenord.</p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">AI-assistans för byrår</h2>
        <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">Byråer hanterar stora volymer bokföringsposter och leverantörsfakturor. AI-baserad OCR-inläsning av leverantörsfakturor och automatiska konteringsförslag sparar avsevärd tid, särskilt för byråer som hanterar kunder med hög faktureringsvolym.</p>
        <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">En AI-assistent som kan svara på frågor om en kunds ekonomi — "stämmer momsrutan för det här kontot?" eller "har den här kunden obetalda fakturor äldre än 90 dagar?" — är ett kraftfullt verktyg för effektivt byråarbete.</p>

        <h2 className="text-2xl font-black text-gray-900 mt-12 mb-4">Jämförelse: traditionellt vs modernt byråsystem</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 pr-6 font-semibold text-gray-900">Funktion</th>
                <th className="text-left py-3 pr-6 font-semibold text-gray-500">Traditionellt</th>
                <th className="text-left py-3 font-semibold text-indigo-600">Modernt (Endoo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Byta kundkonto", "Logga ut, logga in", "Ett klick"],
                ["Rollstyrning", "Begränsad eller ingen", "Per användare och kund"],
                ["Byråöversikt", "Saknas", "Alla kunder i en vy"],
                ["White-label", "Extramodul", "Inbyggt"],
                ["SIE4-export", "Tillval", "Inbyggt per kund"],
                ["Kundportal", "Saknas", "Inbyggt med magic link"],
                ["AI-assistans", "Saknas", "Inbyggt, kopplad till data"],
                ["OCR-inläsning", "Separat tjänst", "Inbyggt"],
              ].map(([feat, old, modern]) => (
                <tr key={feat}>
                  <td className="py-3 pr-6 font-medium text-gray-900">{feat}</td>
                  <td className="py-3 pr-6 text-gray-500">{old}</td>
                  <td className="py-3 text-indigo-700 font-medium">{modern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-16 bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">Prova Endoos byråläge gratis</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">Skapa ett byråkonto och lägg till dina första kundkonton på minuter. Inget kreditkort. Full tillgång till byråläge, white-label och kundportaler.</p>
          <Link href="/register?plan=pro" className="inline-block px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Skapa byråkonto gratis →</Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-4">Relaterade artiklar</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: "/byra", label: "Endoo för byråer — alla funktioner" },
              { href: "/artiklar/vad-ar-sie-fil", label: "Vad är en SIE-fil?" },
              { href: "/artiklar/ai-bokforing", label: "Så kan AI hjälpa med bokföring" },
              { href: "/artiklar/vad-ar-bas-kontoplan", label: "Vad är BAS-kontoplan?" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="text-sm text-indigo-600 hover:underline bg-gray-50 rounded-lg px-4 py-3 block">{l.label} →</Link>
            ))}
          </div>
        </div>
      </article>

      <footer className="border-t border-gray-100 bg-gray-50 py-10 px-6 text-center text-xs text-gray-400">
        <Link href="/" className="font-semibold text-gray-600 hover:text-gray-900">endoo.se</Link>
        {" · "}
        <Link href="/artiklar" className="hover:text-gray-600">Artiklar</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-gray-600">Integritetspolicy</Link>
        {" · © "}{new Date().getFullYear()} Endoo
      </footer>
    </main>
  )
}
