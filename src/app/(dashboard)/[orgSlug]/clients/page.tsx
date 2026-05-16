"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { stringToColor, initials } from "@/lib/utils"

type Client = {
  id: string
  name: string
  slug: string
  isActive: boolean
  plan: string
  memberCount: number
  invoiceCount: number
  grantedAt: string
}

const PLAN_LABELS: Record<string, string> = { free: "Gratis", starter: "Starter", pro: "Pro", agency: "Agency" }

export default function AgencyClientsPage() {
  const params  = useParams<{ orgSlug: string }>()
  const router  = useRouter()
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [entering, setEntering]   = useState<string | null>(null)
  const [error, setError]         = useState("")

  useEffect(() => {
    fetch("/api/agency/clients")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setClients(data); setLoading(false) })
  }, [])

  async function enterClient(client: Client) {
    setEntering(client.id)
    setError("")
    const res = await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientOrganizationId: client.id }),
    })
    if (res.ok) {
      const { slug } = await res.json()
      router.push(`/${slug}`)
    } else {
      const d = await res.json()
      setError(d.error ?? "Kunde inte öppna kundkontot")
      setEntering(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kundkonton</h1>
        <p className="text-sm text-gray-500 mt-1">{clients.length} kopplade kunder</p>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Laddar…</div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">◈</p>
              <p className="font-medium text-gray-900">Inga kundkonton kopplade</p>
              <p className="text-sm text-gray-400 mt-1">Koppla kundkonton via plattformsinställningarna</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kund</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Användare</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Fakturor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: stringToColor(c.name) }}
                        >
                          {initials(c.name, 1)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{PLAN_LABELS[c.plan] ?? c.plan}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{c.memberCount}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{c.invoiceCount}</td>
                    <td className="px-5 py-3">
                      {c.isActive
                        ? <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">Aktivt</span>
                        : <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-600">Inaktivt</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        disabled={!c.isActive || entering === c.id}
                        loading={entering === c.id}
                        onClick={() => enterClient(c)}
                      >
                        Arbeta som kund →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
