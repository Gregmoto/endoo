"use client"

import { useRef, useState } from "react"
import { BottomSheet } from "./BottomSheet"

interface CameraCaptureProps {
  open:    boolean
  onClose: () => void
  orgSlug: string
}

type State = "idle" | "preview" | "uploading" | "done" | "error"

interface ScanResult {
  vendor?:  string
  amount?:  number   // öre
  date?:    string   // YYYY-MM-DD
  currency?: string
  confidence: "high" | "medium" | "low"
}

export function CameraCapture({ open, onClose, orgSlug }: CameraCaptureProps) {
  const inputRef             = useRef<HTMLInputElement>(null)
  const [state, setState]    = useState<State>("idle")
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile]      = useState<File | null>(null)
  const [result, setResult]  = useState<ScanResult | null>(null)
  const [error, setError]    = useState("")

  function reset() {
    setState("idle")
    setPreview(null)
    setFile(null)
    setResult(null)
    setError("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setState("preview")
  }

  async function handleUpload() {
    if (!file) return
    setState("uploading")
    setError("")

    try {
      const form = new FormData()
      form.append("file", file)

      const res  = await fetch("/api/receipts/scan", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Skanningen misslyckades")

      setResult(data)
      setState("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fel uppstod")
      setState("error")
    }
  }

  function confidenceColor(c: ScanResult["confidence"]) {
    return c === "high" ? "text-green-600" : c === "medium" ? "text-yellow-600" : "text-red-500"
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Skanna kvitto" maxHeight="85vh">
      {/* Hidden file input — capture="environment" opens rear camera directly */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <div className="p-5 space-y-5">
        {/* IDLE */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center text-4xl">
              📷
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Ta en bild av kvittot</p>
              <p className="text-sm text-muted-foreground mt-1">Vi fyller i datum, belopp och leverantör automatiskt</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-sm active:bg-brand-700 transition-colors"
            >
              Öppna kamera
            </button>
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute("capture")
                  inputRef.current.click()
                  setTimeout(() => inputRef.current?.setAttribute("capture", "environment"), 500)
                }
              }}
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              Välj från bildbibliotek
            </button>
          </div>
        )}

        {/* PREVIEW */}
        {state === "preview" && preview && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Kvitto" className="w-full h-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={reset}
                className="py-3 rounded-xl border border text-sm font-medium text-muted-foreground active:bg-muted"
              >
                Ta om
              </button>
              <button
                onClick={handleUpload}
                className="py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold active:bg-brand-700"
              >
                Analysera →
              </button>
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {state === "uploading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Analyserar kvitto…</p>
          </div>
        )}

        {/* DONE */}
        {state === "done" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <p className="font-semibold text-foreground">Kvitto skannat</p>
              <span className={`ml-auto text-xs font-medium ${confidenceColor(result.confidence)}`}>
                {result.confidence === "high" ? "Hög säkerhet" : result.confidence === "medium" ? "Medel säkerhet" : "Låg säkerhet"}
              </span>
            </div>

            <div className="rounded-xl bg-muted divide-y divide-gray-100">
              {result.vendor && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Leverantör</span>
                  <span className="font-medium text-foreground">{result.vendor}</span>
                </div>
              )}
              {result.amount != null && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Belopp</span>
                  <span className="font-medium text-foreground">
                    {(result.amount / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} {result.currency ?? "SEK"}
                  </span>
                </div>
              )}
              {result.date && (
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Datum</span>
                  <span className="font-medium text-foreground">{result.date}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={reset}
                className="py-3 rounded-xl border border text-sm font-medium text-muted-foreground"
              >
                Skanna till
              </button>
              <button
                onClick={() => {
                  const qs = new URLSearchParams()
                  if (result.vendor) qs.set("vendor", result.vendor)
                  if (result.amount) qs.set("amount", String(result.amount))
                  if (result.date)   qs.set("date",   result.date)
                  window.location.href = `/${orgSlug}/supplier-invoices/new?${qs}`
                }}
                className="py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold"
              >
                Skapa utlägg →
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || "Skanningen misslyckades. Försök igen."}
            </div>
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm"
            >
              Försök igen
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
