import type { Metadata } from "next"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "./SignOutButton"

const navItems = [
  { href: "/platform/organizations", label: "Organisationer" },
  { href: "/platform/users", label: "Användare" },
  { href: "/platform/audit", label: "Aktivitetslogg" },
]

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) redirect("/")

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Endoo Platform</p>
          <p className="text-sm text-gray-200 mt-0.5">Super Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 flex flex-col gap-2">
          <Link href="/" className="text-xs text-muted-foreground hover:text-gray-300">
            ← Tillbaka till appen
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  )
}
