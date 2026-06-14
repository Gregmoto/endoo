"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

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
  requireBankId:       boolean
}

type State = "loading" | "ready" | "signing" | "signed" | "declined" | "error" | "bankid_pending"

const CLS = "w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"

export default function SigningPage() {
  const { token }       = useParams<{ token: string }>()
  const searchParams    = useSearchParams()
  const bankidResult    = searchParams.get("bankid")

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

        // BankID callback result
        if (bankidResult === "done") {
          setState("signed")
          return
        }
        if (bankidResult === "error") {
          const reason = searchParams.get("reason") ?? "bankid_failed"
          setError(decodeBankIdError(reason))
        }

        setState("ready")
      })
      .catch(() => { setError("Kunde inte ladda sidan"); setState("error") })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function initiateBankId() {
    setState("bankid_pending")
    window.location.href = `/api/sign/${token}/bankid/initiate`
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
          color="muted"
          title="Avböjt"
          subtitle="Du har avböjt att signera detta dokument."
        />
      </Shell>
    )
  }

  // ── BankID redirect in progress ───────────────────────────────────────────────

  if (state === "bankid_pending") {
    return (
      <Shell>
        <div className="flex flex-col items-center py-20 px-6 text-center gap-4">
          <BankIdLogo />
          <p className="text-sm text-muted-foreground">Startar BankID…</p>
        </div>
      </Shell>
    )
  }

  const expiry  = new Date(ctx.expiresAt).toLocaleDateString("sv-SE")
  const canSign = agreed && sigText.trim().length > 0

  // ── Ready to sign ─────────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Header */}
      <div className="bg-primary px-6 py-5 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Signeringsbegäran</p>
        <h1 className="text-xl font-bold truncate">{ctx.title}</h1>
        <p className="text-sm opacity-80 mt-0.5">Från {ctx.orgName}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* BankID error banner */}
        {error && bankidResult === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Message */}
        {ctx.message && (
          <div className="bg-accent border border-border rounded-lg px-4 py-3 text-sm text-foreground italic">
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
          <div className="rounded-lg border overflow-hidden">
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
          <div className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            Dokumentet är bifogat i e-postinbjudan.<br />Granska det innan du signerar.
          </div>
        )}

        {!declining ? (
          <>
            {ctx.requireBankId ? (
              /* ── BankID signing ──────────────────────────────────────────── */
              <BankIdSigningSection
                signerName={ctx.signerName}
                onInitiate={initiateBankId}
                onDecline={() => setDeclining(true)}
              />
            ) : (
              /* ── Text signature ──────────────────────────────────────────── */
              <>
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

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm text-foreground leading-relaxed">
                    Jag har läst och förstår dokumentet ovan och godkänner det med denna elektroniska signatur.
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submit("sign")}
                    disabled={!canSign || state === "signing"}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {state === "signing" ? "Signerar…" : "Signera dokument"}
                  </button>
                  <button
                    onClick={() => setDeclining(true)}
                    className="px-4 py-3 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Avböj
                  </button>
                </div>

                {error && !bankidResult && <p className="text-sm text-destructive">{error}</p>}
              </>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Giltigt till <strong>{expiry}</strong>. Genom att signera godkänner du att din e-postadress ({ctx.signerEmail}) och
              IP-adress registreras som del av signeringsprocessen i enlighet med eIDAS (EU 910/2014).
              {ctx.requireBankId && " Signeringen verifieras med BankID."}
            </p>
          </>
        ) : (
          /* ── Decline form ──────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                className="rounded-lg bg-destructive text-destructive-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
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

function BankIdSigningSection({
  signerName,
  onInitiate,
  onDecline,
}: {
  signerName: string
  onInitiate: () => void
  onDecline: () => void
}) {
  const [agreed, setAgreed] = useState(false)
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-accent/40 px-5 py-4 flex items-start gap-4">
        <div className="mt-0.5">
          <BankIdLogo />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Signering med BankID krävs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Du identifierar dig säkert med ditt BankID. Inga extra inloggningar behövs.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Inloggad som: <span className="font-medium text-foreground">{signerName}</span>
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border text-primary focus:ring-primary/50"
        />
        <span className="text-sm text-foreground leading-relaxed">
          Jag har läst och förstår dokumentet ovan och godkänner det med min elektroniska signatur via BankID.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={onInitiate}
          disabled={!agreed}
          className="flex-1 rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          // audit-ok: BankID official brand color — must not be changed per BankID brand guidelines
          style={{ background: "#193E8F", color: "#fff" }} // audit-ok
        >
          Signera med BankID
        </button>
        <button
          onClick={onDecline}
          className="px-4 py-3 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Avböj
        </button>
      </div>
    </div>
  )
}

function BankIdLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="BankID">
      {/* audit-ok: BankID official brand color */}
      <rect width="100" height="100" rx="16" fill="#193E8F"/> {/* audit-ok */}
      <text x="50" y="62" textAnchor="middle" fill="white" fontSize="38" fontFamily="Arial, sans-serif" fontWeight="bold">BID</text>
    </svg>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg overflow-hidden border">
        {children}
        <div className="px-6 py-4 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground/60">Säker e-signering via <span className="font-semibold text-muted-foreground">Endoo</span></p>
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({
  icon, color, title, subtitle,
}: {
  icon: string
  color: "green" | "muted"
  title: string
  subtitle: string
}) {
  const cls = color === "green"
    ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
    : "bg-muted text-muted-foreground"
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-5 ${cls}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
    </div>
  )
}

function decodeBankIdError(reason: string): string {
  const map: Record<string, string> = {
    session_expired:  "Sessionen har gått ut. Försök igen.",
    nonce_mismatch:   "Säkerhetsfel vid BankID-autentisering. Försök igen.",
    exchange_failed:  "BankID-autentiseringen misslyckades. Försök igen.",
    expired:          "Signeringslänken har löpt ut.",
    not_found:        "Signeringslänken är ogiltig.",
    missing_params:   "Felaktig återlänk från BankID.",
    invalid_state:    "Säkerhetsfel. Försök igen.",
    access_denied:    "Du avbröt BankID-inloggningen.",
  }
  return map[reason] ?? "BankID-autentiseringen misslyckades. Försök igen."
}
