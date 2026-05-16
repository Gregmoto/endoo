"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type ContactPerson = { name: string; email: string | null; phone: string | null }
type Contact = {
  id: string
  name: string
  customerNumber: string | null
  email: string | null
  phone: string | null
  city: string | null
  type: "business" | "individual"
  status: "active" | "inactive" | "blocked" | "ended" | "test"
  orgNumber: string | null
  createdAt: string
  contactPersons: ContactPerson[]
  _count: { invoices: number }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:   { label: "Aktiv",    cls: "bg-green-100 text-green-700" },
  inactive: { label: "Inaktiv",  cls: "bg-gray-100 text-gray-500" },
  blocked:  { label: "Blockerad",cls: "bg-red-100 text-red-700" },
  ended:    { label: "Avslutad", cls: "bg-orange-100 text-orange-700" },
  test:     { label: "Test",     cls: "bg-purple-100 text-purple-700" },
}

export default function ContactsPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const router = useRouter()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch]   = useState("")
  const [status, setStatus]   = useState("")
  const [type, setType]       = useState("")
  const [page, setPage]       = useState(1)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set("search", search)
    if (status) qs.set("status", status)
    if (type)   qs.set("type", type)
    const res = await fetch(`/api/contacts?${qs}`)
    if (res.ok) {
      const data = await res.json()
      setContacts(data.contacts)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, search, status, type])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, status, type])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontakter</h1>
          <p className="text-sm text-gray-500 mt-1">{total} kontakter totalt</p>
        </div>
        <Link href={`/${orgSlug}/contacts/new`}>
          <Button size="sm">+ Ny kontakt</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="search"
          placeholder="Sök namn, e-post, org.nr, kundnr…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alla statusar</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="blocked">Blockerad</option>
          <option value="ended">Avslutad</option>
          <option value="test">Test</option>
        </select>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alla typer</option>
          <option value="business">Företag</option>
          <option value="individual">Privatperson</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">Laddar…</div>
          ) : contacts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-400">Inga kontakter hittades.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kundnr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kontaktperson</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Typ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Fakturor</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const s = STATUS_LABELS[c.status] ?? STATUS_LABELS.active
                  const primary = c.contactPersons[0]
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/contacts/${c.id}`)}
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.city && <p className="text-xs text-gray-400">{c.city}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{c.customerNumber ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-6 py-3">
                        {primary ? (
                          <div>
                            <p className="text-gray-800">{primary.name}</p>
                            {primary.email && <p className="text-xs text-gray-400">{primary.email}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {c.type === "business" ? "Företag" : "Privatperson"}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">{c._count.invoices}</td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/${orgSlug}/contacts/${c.id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Öppna →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Sida {page} av {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Föregående
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Nästa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
