"use client"

import { useState, useRef }   from "react"
import { useParams, useRouter } from "next/navigation"
import Link                    from "next/link"

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp"

export default function UploadSupplierInvoicePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router      = useRouter()

  const [file,     setFile]     = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError("")

    const form = new FormData()
    form.append("file", file)

    const uploadRes = await fetch("/api/supplier-invoices", { method: "POST", body: form })
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      setError(uploadData.error ?? "Uppladdning misslyckades")
      setLoading(false)
      return
    }

    const invoiceId = uploadData.invoice.id

    // Trigger AI extraction (non-blocking from user perspective — navigate immediately)
    fetch(`/api/supplier-invoices/${invoiceId}/extract`, { method: "POST" }).catch(() => {})

    router.push(`/${orgSlug}/supplier-invoices/${invoiceId}`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${orgSlug}/supplier-invoices`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Tillbaka
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Ladda upp leverantörsfaktura</h1>
        <p className="text-sm text-gray-500 mt-1">PDF eller bild — AI analyserar fakturan automatiskt</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
            dragging
              ? "border-indigo-400 bg-indigo-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <>
              <span className="text-3xl">📄</span>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="text-xs text-red-500 hover:underline"
              >
                Ta bort
              </button>
            </>
          ) : (
            <>
              <span className="text-4xl">☁</span>
              <p className="text-sm font-medium text-gray-700">
                Dra och släpp, eller <span className="text-indigo-600">välj fil</span>
              </p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG, WebP — max 10 MB</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="mt-4 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Laddar upp…" : "Ladda upp och analysera"}
        </button>
      </form>

      {/* Info box */}
      <div className="mt-6 bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 space-y-1">
        <p className="font-medium">Vad händer sedan?</p>
        <ul className="list-disc list-inside text-indigo-700 space-y-0.5 text-xs">
          <li>Claude Vision läser fakturan och extraherar alla fält</li>
          <li>Du granskar och bekräftar uppgifterna</li>
          <li>Fakturan kontoförs och bokförs i huvudboken</li>
          <li>Markera som betald när betalningen är genomförd</li>
        </ul>
      </div>
    </div>
  )
}
