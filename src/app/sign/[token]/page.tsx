"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type SigningContext = {
  requestId:           string
  title:               string
  message:             string | null
  orgName:             string
  expiresAt:           string
  documentSnapshotUrl: string | null
  signerName:          string
  signerEmail:         string
  totalSigners:        number
  signedCount:         number
}

type State = "loading" | "ready" | "signing" | "signed" | "declined" | "error"

const CLS = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"

export default function SigningPage() {
  const { token } = useParams<{ token: string }>()

  const [ctx,   setCtx]   = useState<SigningContext | null>(null)
  const [state, setState] = useState<State>("loading")
  const [error, setError] = useState<string | null>(null)

  const [sigText,   setSigText]   = useState("")
  const [agreed,    setAgreed]    = useState(false)
  const [declining, setDeclining] = useState(false)
  const [decReason, setDecReason] = useState("")

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          if (data.alreadySigned)   { setState("signed");   return }
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

  async function submit(action: "sign" | "decline") {
    setState("signing")
    const body = action === "sign"
      ? { action: "sign", signatureText: sigText }
      : { action: "decline", reason: decReason || undefined }

    const res  = await fetch(`/api/sign/${token}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (res.ok) {
      setState(action === "sign" ? "signed" : "declined")
    } else {
      setError(data.error ?? "Något gick fel")
      setState("ready")
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Laddar…</div>
      </Shell>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (state === "error" || !ctx) {
    return (
      <Shell>
        <div className="flex flex-col items-center py-16 text-center px-6">
          <span className="text-4xl mb-4">⚠️</span>
          <h2 className="text-lg font-semibold text-foreground mb-2">Länken är ogiltig</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{error ?? "Denna signeringslänk är ogiltig eller har löpt ut."}</p>
        </div>
      </Shell>
    )
  }

  // ── Already signed ────────────────────────────────────────────────────────────

  if (state === "signed") {
    return (
      <Shell>
        <SuccessScreen
          icon="✓"
          color="green"
          title="Signerat!"
          subtitle={ctx ? `Du har signerat "${ctx.title}". Tack!` : "Du har redan signerat detta dokument."}
        />
      </Shell>
    )
  }

  // ── Already declined ──────────────────────────────────────────────────────────

  if (state === "declined") {
    return (
      <Shell>
        <SuccessScreen
          icon="✗"
          color="gray"
          title="Avböjt"
          subtitle="Du har avböjt att signera detta dokument."
        />
      </Shell>
    )
  }

  const expiry   = new Date(ctx.expiresAt).toLocaleDateString("sv-SE")
  const canSign  = agreed && sigText.trim().length > 0

  // ── Ready to sign ─────────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">Signeringsbegäran</p>
        <h1 className="text-xl font-bold truncate">{ctx.title}</h1>
        <p className="text-sm text-indigo-200 mt-0.5">Från {ctx.orgName}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Message */}
        {ctx.message && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800 italic">
            {ctx.message}
          </div>
        )}

        {/* Progress */}
        {ctx.totalSigners > 1 && (
          <div className="text-xs text-muted-foreground">
            {ctx.signedCount} av {ctx.totalSigners} signerare klara
          </div>
        )}

        {/* PDF viewer */}
        {ctx.documentSnapshotUrl && (
          <div className="rounded-lg border border overflow-hidden">
            <div className="bg-muted border-b border px-3 py-2 text-xs text-muted-foreground font-medium">
              Dokument att signera
            </div>
            <iframe
              src={ctx.documentSnapshotUrl}
              className="w-full"
              style={{ height: "480px" }}
              title="Dokument"
            />
          </div>
        )}

        {!ctx.documentSnapshotUrl && (
          <div className="rounded-lg border border-dashed border px-6 py-8 text-center text-sm text-muted-foreground">
            Dokumentet är bifogat i e-postinbjudan.<br />Granska det innan du signerar.
          </div>
        )}

        {/* Decline mode toggle */}
        {!declining ? (
          <>
            {/* Signature */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Din signatur — skriv ditt fullständiga namn
              </label>
              <input
                className={`${CLS} font-serif text-lg`}
                placeholder={ctx.signerName}
                value={sigText}
                onChange={e => setSigText(e.target.value)}
                autoComplete="name"
                spellCheck={false}
              />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-foreground leading-relaxed">
                Jag har läst och förstår dokumentet ovan och godkänner det med denna elektroniska signatur.
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => submit("sign")}
                disabled={!canSign || state === "signing"}
                className="flex-1 rounded-lg bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {state === "signing" ? "Signerar…" : "Signera dokument"}
              </button>
              <button
                onClick={() => setDeclining(true)}
                className="px-4 py-3 rounded-lg border border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Avböj
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Legal notice */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Giltigt till <strong>{expiry}</strong>. Genom att signera godkänner du att din e-postadress ({ctx.signerEmail}) och
              IP-adress registreras som del av signeringsprocessen i enlighet med eIDAS (EU 910/2014).
            </p>
          </>
        ) : (
          /* Decline form */
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
              Du håller på att avböja att signera detta dokument. Avsändaren meddelas.
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Anledning (valfri)</label>
              <textarea
                className={`${CLS} min-h-[80px] resize-none`}
                placeholder="Berätta gärna varför du avböjer…"
                value={decReason}
                onChange={e => setDecReason(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => submit("decline")}
                disabled={state === "signing"}
                className="rounded-lg bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {state === "signing" ? "Skickar…" : "Bekräfta avböjande"}
              </button>
              <button
                onClick={() => setDeclining(false)}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-2.5"
              >
                Tillbaka
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg overflow-hidden border border">
        {children}
        <div className="px-6 py-4 border-t border-border/50 text-center">
          <p className="text-xs text-gray-300">Säker e-signering via <span className="font-semibold text-muted-foreground">Endoo</span></p>
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({
  icon, color, title, subtitle,
}: {
  icon: string
  color: "green" | "gray"
  title: string
  subtitle: string
}) {
  const bg = color === "green" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-5 ${bg}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
    </div>
  )
}
