"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type SignerRow = { name: string; email: string; status: string }

type Request = {
  id:         string
  title:      string
  entityType: string
  entityId:   string
  status:     string
  expiresAt:  string
  createdAt:  string
  signers:    SignerRow[]
}

const STATUS: Record<string, { label: string; cls: string }> = {
  sent:             { label: "Väntar",         cls: "bg-blue-100 text-blue-700" },
  partially_signed: { label: "Delvis signerat", cls: "bg-yellow-100 text-yellow-700" },
  completed:        { label: "Signerat",        cls: "bg-green-100 text-green-700" },
  declined:         { label: "Avböjt",          cls: "bg-red-100 text-red-700" },
  expired:          { label: "Utgånget",        cls: "bg-gray-100 text-gray-500" },
  cancelled:        { label: "Avbrutet",        cls: "bg-gray-100 text-gray-500" },
}

const SIGNER_ICON: Record<string, string> = {
  pending: "○", viewed: "◎", signed: "✓", declined: "✗",
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sv-SE")
}

export default function SignaturesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch("/api/signatures")
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(({ requests }) => { setRequests(requests); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const active = requests.filter(r => ["sent", "partially_signed"].includes(r.status))
  const done   = requests.filter(r => !["sent", "partially_signed"].includes(r.status))

  function entityLink(r: Request) {
    const base = `/${orgSlug}`
    if (r.entityType === "contract") return `${base}/contracts/${r.entityId}`
    return `${base}/invoices/${r.entityId}`
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">E-signeringar</h1>
        <p className="text-sm text-gray-500 mt-1">Alla signeringsbegäran för organisationen</p>
      </div>

      {loading && <p className="text-sm text-gray-400">Laddar…</p>}

      {!loading && requests.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400 mb-1">Inga signeringsbegäran ännu</p>
          <p className="text-xs text-gray-300">Gå till ett avtal eller en offert för att skicka för signering</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Aktiva ({active.length})</h2>
          <div className="space-y-2">
            {active.map(r => <RequestRow key={r.id} r={r} entityLink={entityLink(r)} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Avslutade ({done.length})</h2>
          <div className="space-y-2">
            {done.map(r => <RequestRow key={r.id} r={r} entityLink={entityLink(r)} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function RequestRow({ r, entityLink }: { r: Request; entityLink: string }) {
  const st = STATUS[r.status] ?? { label: r.status, cls: "bg-gray-100 text-gray-500" }
  const signers = r.signers.filter(s => s.status !== "cc")

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          <span className="text-xs text-gray-400">
            {r.entityType === "contract" ? "Avtal" : "Offert"}
          </span>
        </div>
        <Link href={entityLink} className="font-medium text-gray-900 text-sm hover:text-indigo-600 truncate block">
          {r.title}
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {signers.map((s, i) => (
            <span key={i} className="flex items-center gap-1 text-[12px] text-gray-500">
              <span className={s.status === "signed" ? "text-green-600" : s.status === "declined" ? "text-red-500" : "text-gray-400"}>
                {SIGNER_ICON[s.status] ?? "○"}
              </span>
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
        {["sent", "partially_signed"].includes(r.status) && (
          <p className="text-xs text-gray-400 mt-0.5">Utgår {fmtDate(r.expiresAt)}</p>
        )}
      </div>
    </div>
  )
}
