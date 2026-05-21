import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Auth layout — centered, no sidebar, no org context
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
  )
}
