import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

const navItems = [
  { href: "/platform/organizations", label: "Organisationer" },
  { href: "/platform/users", label: "Användare" },
  { href: "/platform/audit", label: "Aktivitetslogg" },
]

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) redirect("/")

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Endoo Platform</p>
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
        <div className="p-4 border-t border-gray-700">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
            ← Tillbaka till appen
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  )
}
