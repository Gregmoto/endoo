"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams }                         from "next/navigation"
import Link                                  from "next/link"

type Account  = { number: string; name: string; type: string }
type Entry    = { id: string; debit: string; credit: string; description: string | null; vatCode: string | null; sortOrder: number; account: Account }
type JournalDetail = {
  id:          string
  reference:   string
  date:        string
  description: string
  status:      string
  sourceType:  string | null
  sourceId:    string | null
  postedAt:    string | null
  createdAt:   string
  voidOf:      string | null
  fiscalYear:  { name: string }
  series:      { prefix: string; name: string }
  entries:     Entry[]
}

const STATUS_COLOR: Record<string, string> = {
  draft:  "bg-yellow-100 text-yellow-700",
  posted: "bg-green-100 text-green-700",
  voided: "bg-gray-100 text-gray-500",
}
const STATUS_LABEL: Record<string, string> = { draft: "Utkast", posted: "Bokförd", voided: "Återförd" }

function fmt(ore: string) {
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(Number(ore) / 100)
}

export default function JournalDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()

  const [journal, setJournal] = useState<JournalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [error,   setError]   = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/journals/${id}`)
    if (res.ok) setJournal(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function act(action: "post" | "void") {
    setActing(true); setError("")
    const reason = action === "void" ? prompt("Anledning till återföring:") ?? "Manuell återföring" : undefined
    const res = await fetch(`/api/journals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    })
    if (res.ok) await load()
    else { const d = await res.json(); setError(d.error ?? "Fel") }
    setActing(false)
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Laddar…</div>
  if (!journal) return <div className="p-6 text-sm text-red-500">Verifikat hittades inte.</div>

  const totalDebit  = journal.entries.reduce((s, e) => s + Number(e.debit), 0)
  const totalCredit = journal.entries.reduce((s, e) => s + Number(e.credit), 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 1

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={`/${orgSlug}/journals`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Bokföring
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground font-mono">{journal.reference}</h1>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[journal.status]}`}>
              {STATUS_LABEL[journal.status]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{journal.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(journal.date).toLocaleDateString("sv-SE")} · {journal.series.name} · Räkenskapsår {journal.fiscalYear.name}
            {journal.postedAt && ` · Bokförd ${new Date(journal.postedAt).toLocaleDateString("sv-SE")}`}
          </p>
        </div>
        <div className="flex gap-2">
          {journal.status === "draft" && (
            <button
              onClick={() => act("post")}
              disabled={acting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {acting ? "Bokför…" : "Bokför verifikat"}
            </button>
          )}
          {journal.status === "posted" && (
            <button
              onClick={() => act("void")}
              disabled={acting}
              className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {acting ? "Återför…" : "Återför"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

      {/* Journal entries */}
      <div className="bg-card rounded-xl border border shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border bg-muted/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Konto</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Beskrivning</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Momskod</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Debet</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {journal.entries.map(e => (
              <tr key={e.id} className="border-t border-border/50">
                <td className="px-5 py-2.5">
                  <span className="font-mono text-xs text-indigo-700 font-semibold">{e.account.number}</span>
                  <span className="ml-2 text-foreground">{e.account.name}</span>
                </td>
                <td className="px-5 py-2.5 text-muted-foreground text-xs">{e.description ?? "—"}</td>
                <td className="px-5 py-2.5 text-muted-foreground text-xs font-mono">{e.vatCode ?? "—"}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-foreground">
                  {Number(e.debit) > 0 ? fmt(e.debit) : ""}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-foreground">
                  {Number(e.credit) > 0 ? fmt(e.credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border bg-muted/50">
              <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Summa</td>
              <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">{fmt(String(totalDebit))}</td>
              <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">{fmt(String(totalCredit))}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-5 py-2 text-xs">
                {balanced
                  ? <span className="text-green-600 font-medium">✓ Balanserat</span>
                  : <span className="text-red-600 font-medium">⚠ Obalanserat — differens {fmt(String(Math.abs(totalDebit - totalCredit)))}</span>
                }
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {journal.voidOf && (
        <div className="text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
          Detta verifikat återför{" "}
          <Link href={`/${orgSlug}/journals/${journal.voidOf}`} className="text-indigo-600 hover:underline font-mono">
            {journal.voidOf.slice(0, 8)}…
          </Link>
        </div>
      )}
    </div>
  )
}
