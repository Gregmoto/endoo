"use client"

import { useEffect, useState } from "react"
import { useParams }           from "next/navigation"

type LineItem = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

type QuoteContext = {
  quoteId:     string
  number:      string
  title:       string | null
  orgName:     string
  contactName: string
  currency:    string
  lineItems:   LineItem[]
  notes:       string | null
  terms:       string | null
  validUntil:  string | null
  status:      string
}

type State = "loading" | "ready" | "submitting" | "accepted" | "declined" | "error"

const CLS = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"

function fmt(n: number, cur: string) {
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
}

export default function QuoteApprovalPage() {
  const { token } = useParams<{ token: string }>()

  const [ctx,      setCtx]      = useState<QuoteContext | null>(null)
  const [state,    setState]    = useState<State>("loading")
  const [error,    setError]    = useState<string | null>(null)
  const [declining, setDeclining] = useState(false)
  const [note,     setNote]     = useState("")

  useEffect(() => {
    fetch(`/api/q/${token}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          if (data.alreadyAccepted) { setState("accepted"); return }
          if (data.alreadyDeclined) { setState("declined"); return }
          setError(data.error ?? "Ogiltig länk")
          setState("error")
          return
        }
        setCtx(data)
        setState("ready")
      })
      .catch(() => { setError("Kunde inte ladda sidan"); setState("error") })
  }, [token])

  async function submit(action: "accept" | "decline") {
    setState("submitting")
    const res  = await fetch(`/api/q/${token}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, note: note || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setState(action === "accept" ? "accepted" : "declined")
    } else {
      setError(data.error ?? "Något gick fel")
      setState("ready")
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Laddar…</div>
      </Shell>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (state === "error" || (!ctx && state !== "accepted" && state !== "declined")) {
    return (
      <Shell>
        <div className="flex flex-col items-center py-16 text-center px-6">
          <span className="text-4xl mb-4">⚠️</span>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Länken är ogiltig</h2>
          <p className="text-sm text-gray-500 max-w-xs">{error ?? "Denna offertlänk är ogiltig eller har löpt ut."}</p>
        </div>
      </Shell>
    )
  }

  // ── Already responded ─────────────────────────────────────────────────────

  if (state === "accepted") {
    return (
      <Shell>
        <SuccessScreen icon="✓" color="green" title="Offert godkänd!" subtitle={ctx ? `Du har godkänt offert ${ctx.number}. Avsändaren meddelas.` : "Du har redan godkänt denna offert."} />
      </Shell>
    )
  }

  if (state === "declined") {
    return (
      <Shell>
        <SuccessScreen icon="✗" color="gray" title="Offert avböjd" subtitle="Du har avböjt denna offert. Avsändaren meddelas." />
      </Shell>
    )
  }

  if (!ctx) return null

  // Compute totals
  let subtotalKr = 0
  let taxKr      = 0
  for (const l of ctx.lineItems) {
    const net  = l.quantity * (l.unitPriceKr ?? 0) * (1 - (l.discountRate ?? 0))
    subtotalKr += net
    taxKr      += net * (l.taxRate ?? 0)
  }
  const totalKr  = subtotalKr + taxKr
  const cur      = ctx.currency
  const expiry   = ctx.validUntil ? new Date(ctx.validUntil).toLocaleDateString("sv-SE") : null

  // ── Ready ─────────────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">Offert</p>
        <h1 className="text-xl font-bold">{ctx.title ?? ctx.number}</h1>
        <p className="text-sm text-indigo-200 mt-0.5">Från {ctx.orgName}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Note */}
        {ctx.notes && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800 italic">
            {ctx.notes}
          </div>
        )}

        {/* Line items */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Innehåll</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {ctx.lineItems.map((l, i) => {
                const net   = l.quantity * (l.unitPriceKr ?? 0) * (1 - (l.discountRate ?? 0))
                const total = net * (1 + (l.taxRate ?? 0))
                return (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{l.description}</p>
                      <p className="text-xs text-gray-400">{l.quantity} {l.unit} × {fmt(l.unitPriceKr ?? 0, cur)}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                      {fmt(total, cur)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Netto</span><span className="tabular-nums">{fmt(subtotalKr, cur)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Moms</span><span className="tabular-nums">{fmt(taxKr, cur)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Totalt</span><span className="tabular-nums">{fmt(totalKr, cur)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {ctx.terms && (
          <div className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-4 py-3">
            <p className="font-semibold text-gray-600 mb-1 uppercase tracking-wide text-[10px]">Villkor</p>
            {ctx.terms}
          </div>
        )}

        {/* Actions */}
        {!declining ? (
          <div className="space-y-3">
            <button
              onClick={() => submit("accept")}
              disabled={state === "submitting"}
              className="w-full rounded-lg bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === "submitting" ? "Skickar…" : "✓ Godkänn offerten"}
            </button>
            <button
              onClick={() => setDeclining(true)}
              className="w-full rounded-lg border border-gray-200 text-sm text-gray-600 py-2.5 hover:bg-gray-50 transition-colors"
            >
              Avböj
            </button>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
              Du håller på att avböja denna offert. Avsändaren meddelas.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anledning (valfri)</label>
              <textarea
                className={`${CLS} min-h-[72px] resize-none`}
                placeholder="Berätta gärna varför du avböjer…"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submit("decline")}
                disabled={state === "submitting"}
                className="rounded-lg bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {state === "submitting" ? "Skickar…" : "Bekräfta avböjande"}
              </button>
              <button
                onClick={() => setDeclining(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5"
              >
                Tillbaka
              </button>
            </div>
          </div>
        )}

        {expiry && (
          <p className="text-xs text-gray-400 text-center">
            Offerten är giltig till och med <strong>{expiry}</strong>.
          </p>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {children}
        <div className="px-6 py-4 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-300">Offert via <span className="font-semibold text-gray-400">Endoo</span></p>
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({ icon, color, title, subtitle }: {
  icon: string; color: "green" | "gray"; title: string; subtitle: string
}) {
  const bg = color === "green" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-5 ${bg}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-xs">{subtitle}</p>
    </div>
  )
}
