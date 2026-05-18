"use client"

import { useEffect, useState } from "react"

type SignerInfo = {
  id:            string
  name:          string
  email:         string
  role:          string
  status:        "pending" | "viewed" | "signed" | "declined"
  viewedAt:      string | null
  signedAt:      string | null
  declinedAt:    string | null
  reminderCount: number
}

type SignatureRequest = {
  id:         string
  title:      string
  status:     string
  expiresAt:  string
  createdAt:  string
  signers:    SignerInfo[]
}

interface Props {
  entityType: "contract" | "quote"
  entityId:   string
  onRequestSign: () => void
  refreshKey:    number
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  sent:             { label: "Väntar",        cls: "bg-blue-100 text-blue-700" },
  partially_signed: { label: "Delvis signerat",cls: "bg-yellow-100 text-yellow-700" },
  completed:        { label: "Signerat",       cls: "bg-green-100 text-green-700" },
  declined:         { label: "Avböjt",         cls: "bg-red-100 text-red-700" },
  expired:          { label: "Utgånget",       cls: "bg-gray-100 text-gray-500" },
  cancelled:        { label: "Avbrutet",       cls: "bg-gray-100 text-gray-500" },
}

const SIGNER_STATUS: Record<string, { icon: string; cls: string }> = {
  pending:  { icon: "○", cls: "text-gray-400" },
  viewed:   { icon: "◎", cls: "text-blue-500" },
  signed:   { icon: "✓", cls: "text-green-600" },
  declined: { icon: "✗", cls: "text-red-500" },
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("sv-SE")
}

export function SignatureStatusWidget({ entityType, entityId, onRequestSign, refreshKey }: Props) {
  const [requests, setRequests] = useState<SignatureRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [reminding, setReminding] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  function load() {
    fetch(`/api/signatures?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(({ requests }) => { setRequests(requests); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [entityType, entityId, refreshKey])

  async function remind(id: string) {
    setReminding(id)
    await fetch(`/api/signatures/${id}/remind`, { method: "POST" })
    setReminding(null)
    load()
  }

  async function cancel(id: string) {
    if (!confirm("Avbryt signeringsbegäran?")) return
    setCancelling(id)
    await fetch(`/api/signatures/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason: "Avbruten av avsändaren" }),
    })
    setCancelling(null)
    load()
  }

  // Active = sent or partially_signed
  const active  = requests.filter(r => ["sent", "partially_signed"].includes(r.status))
  const past    = requests.filter(r => !["sent", "partially_signed"].includes(r.status))
  const hasActive = active.length > 0

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">E-signering</h3>
        {!hasActive && (
          <button
            onClick={onRequestSign}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            ✍ Skicka för signering
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-muted-foreground">Laddar…</p>}

      {!loading && requests.length === 0 && (
        <div className="rounded-lg border border-dashed border px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Inget signeringsförlopp</p>
          <button
            onClick={onRequestSign}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Skicka för signering →
          </button>
        </div>
      )}

      {/* Active requests */}
      {active.map(req => (
        <RequestCard
          key={req.id}
          req={req}
          onRemind={() => remind(req.id)}
          onCancel={() => cancel(req.id)}
          reminding={reminding === req.id}
          cancelling={cancelling === req.id}
        />
      ))}

      {/* Past requests (collapsed) */}
      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-muted-foreground list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Historik ({past.length})
          </summary>
          <div className="mt-2 space-y-2">
            {past.map(req => (
              <RequestCard key={req.id} req={req} compact />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function RequestCard({
  req, onRemind, onCancel, reminding, cancelling, compact = false,
}: {
  req:        SignatureRequest
  onRemind?:  () => void
  onCancel?:  () => void
  reminding?: boolean
  cancelling?: boolean
  compact?:   boolean
}) {
  const st = STATUS_LABEL[req.status] ?? { label: req.status, cls: "bg-gray-100 text-gray-500" }
  const isActive = ["sent", "partially_signed"].includes(req.status)
  const expiry = fmtDate(req.expiresAt)

  return (
    <div className="rounded-lg border border bg-card p-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate text-xs">{req.title}</p>
          {!compact && expiry && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isActive ? `Giltig till ${expiry}` : `Utgick ${expiry}`}
            </p>
          )}
        </div>
        <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
          {st.label}
        </span>
      </div>

      {/* Signers */}
      <div className="space-y-1">
        {req.signers.filter(s => s.role === "signer").map(signer => {
          const s = SIGNER_STATUS[signer.status]
          return (
            <div key={signer.id} className="flex items-center gap-2 text-[12px]">
              <span className={`font-bold text-sm leading-none ${s.cls}`}>{s.icon}</span>
              <span className="text-foreground truncate flex-1">{signer.name}</span>
              <span className="text-muted-foreground text-[11px]">
                {signer.status === "signed"   && fmtDate(signer.signedAt)}
                {signer.status === "declined" && "Avböjt"}
                {signer.status === "viewed"   && "Sett"}
                {signer.status === "pending"  && "Väntar"}
              </span>
            </div>
          )
        })}
        {req.signers.filter(s => s.role === "cc").map(s => (
          <div key={s.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="text-sm leading-none">CC</span>
            <span className="truncate">{s.name}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {isActive && !compact && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <button
            onClick={onRemind}
            disabled={reminding}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            {reminding ? "Skickar…" : "Skicka påminnelse"}
          </button>
          <span className="text-gray-200">·</span>
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="text-[11px] text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {cancelling ? "Avbryter…" : "Avbryt"}
          </button>
        </div>
      )}
    </div>
  )
}
