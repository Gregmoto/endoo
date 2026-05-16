import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Endoo – Faktureringssystem för byråer och konsulter",
    template: "%s · Endoo",
  },
  description:
    "Endoo är ett modernt faktureringssystem för byråer, frilansare och konsultfirmor. Hantera flera kunder, skicka fakturor med PDF, spåra betalningar och automatisera avtalsfakturering — allt på ett ställe.",
  keywords: [
    "faktureringssystem",
    "faktura online",
    "fakturering byrå",
    "fakturering konsult",
    "skicka faktura",
    "avtalsfakturering",
    "faktura PDF",
    "multi-klient fakturering",
    "SaaS fakturering Sverige",
    "faktureringsverktyg",
  ],
  authors: [{ name: "Endoo" }],
  creator: "Endoo",
  metadataBase: new URL("https://endoo.se"),
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: "https://endoo.se",
    siteName: "Endoo",
    title: "Endoo – Faktureringssystem för byråer och konsulter",
    description:
      "Hantera fakturering för flera kunder från ett ställe. Professionella fakturor, PDF-export, betalningsuppföljning och avtalsfakturering.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Endoo – Fakturering gjort enkelt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Endoo – Faktureringssystem för byråer",
    description: "Professionell fakturering för byråer, frilansare och konsulter. Prova gratis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large" },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
