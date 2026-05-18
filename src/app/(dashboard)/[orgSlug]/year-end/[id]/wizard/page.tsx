"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

type ValidationResult = {
  valid:  boolean
  errors: string[]
}

type AccountSnapshot = {
  accountNumber: string
  accountName:   string
  balance:       string
}

type CloseResult = {
  closingJournalId:        string
  openingJournalId:        string | null
  balanceSheetSnapshot:    AccountSnapshot[]
  incomeStatementSnapshot: AccountSnapshot[]
  closingHash:             string
}

const STEPS = [
  "Validering",
  "Omföring (förhandsvisning)",
  "Ingående balanser",
  "Bekräfta",
  "Klart",
] as const

function fmtOre(str: string): string {
  const n = Number(str) / 100
  return new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2 }).format(n)
}

export default function YearEndWizardPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()

  const [step, setStep]               = useState(0)
  const [validation, setValidation]   = useState<ValidationResult | null>(null)
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [confirmed, setConfirmed]     = useState(false)

  // Step 0 — auto-validate on mount
  useEffect(() => {
    runValidation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function runValidation() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounting/fiscal-years/${id}/year-end/validate`, { method: "POST" })
      const data = await res.json()
      setValidation(data)
    } catch {
      setError("Kunde inte validera räkenskapsåret")
    } finally {
      setLoading(false)
    }
  }

  async function executeClose() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounting/fiscal-years/${id}/year-end/close`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Fel vid bokslut")
        return
      }
      const data: CloseResult = await res.json()
      setCloseResult(data)
      setStep(4)
    } catch {
      setError("Nätverksfel — försök igen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.push(`/${orgSlug}/year-end`)}
        className="text-xs text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Tillbaka
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-1">Stäng räkenskapsår</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Följ stegen nedan för att genomföra årsavslut.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step  ? "bg-green-500 text-white" :
              i === step ? "bg-brand-600 text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* ── Step 0: Validation ── */}
      {step === 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Validering</h2>
          {loading && <p className="text-sm text-muted-foreground">Kontrollerar…</p>}
          {validation && !loading && (
            <>
              {validation.valid ? (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm mb-6">
                  Alla kontroller godkända. Du kan fortsätta med årsavslutet.
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {validation.errors.map((e, i) => (
                    <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                      {e}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={runValidation}
                  className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  Kontrollera igen
                </button>
                {validation.valid && (
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Nästa →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Closing journal preview ── */}
      {step === 1 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Omföring (förhandsvisning)</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Alla resultatkonton (klass 3–8) omförs till konto 2099 Årets resultat.
            Verifikatet skapas och bokförs i nästa steg.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground">
              ← Tillbaka
            </button>
            <button onClick={() => setStep(2)} className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
              Nästa →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Opening balances preview ── */}
      {step === 2 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Ingående balanser</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ingående balanser (IB) för nästa räkenskapsår skapas automatiskt från
            tillgångs- och skuldkonton (klass 1–2).
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground">
              ← Tillbaka
            </button>
            <button onClick={() => setStep(3)} className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
              Nästa →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === 3 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Bekräfta årsavslut</h2>
          <div className="p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm mb-6">
            <strong>Obs!</strong> När du stänger räkenskapsåret är åtgärden permanent och
            kan inte ångras utan hjälp från support. Alla perioder låses och en oföränderlig
            bokslutsrapport skapas.
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              Jag bekräftar att alla verifikat är kontrollerade och att jag vill stänga räkenskapsåret.
            </span>
          </label>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground">
              ← Tillbaka
            </button>
            <button
              onClick={executeClose}
              disabled={!confirmed || loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Stänger…" : "STÄNG"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 4 && closeResult && (
        <div>
          <div className="p-5 rounded-xl bg-green-50 border border-green-200 mb-6">
            <p className="font-semibold text-green-800 mb-1">Räkenskapsåret är avslutat ✓</p>
            <p className="text-sm text-green-700">
              Bokslutsverifikat och ingående balanser har skapats och bokförts.
            </p>
          </div>

          <div className="space-y-2 mb-6 text-xs text-muted-foreground font-mono">
            <p>Omföringsverifikat: {closeResult.closingJournalId}</p>
            {closeResult.openingJournalId && (
              <p>IB-verifikat: {closeResult.openingJournalId}</p>
            )}
            <p className="break-all">SHA-256: {closeResult.closingHash}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/${orgSlug}/year-end/${id}/download`)}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Ladda ner bokslut →
            </button>
            <button
              onClick={() => router.push(`/${orgSlug}/year-end`)}
              className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              Tillbaka till översikt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
