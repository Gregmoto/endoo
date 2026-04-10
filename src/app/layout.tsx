import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Endoo",
  description: "Multi-tenant invoicing platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
