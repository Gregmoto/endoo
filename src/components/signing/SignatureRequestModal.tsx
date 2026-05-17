"use client"

import { useState } from "react"

type SignerRow = { name: string; email: string; role: "signer" | "cc" }

interface Props {
  entityType: "contract" | "quote"
  entityId:   string
  defaultTitle: string
  onClose:  () => void
  onCreated: () => void
}

const CLS = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"

const THIRTY_DAYS = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export function SignatureRequestModal({ entityType, entityId, defaultTitle, onClose, onCreated }: Props) {
  const [title,     setTitle]     = useState(defaultTitle)
  const [message,   setMessage]   = useState("")
  const [expiresAt, setExpiresAt] = useState(THIRTY_DAYS())
  const [signers,   setSigners]   = useState<SignerRow[]>([{ name: "", email: "", role: "signer" }])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function addSigner() {
    setSigners(prev => [...prev, { name: "", email: "", role: "signer" }])
  }

  function removeSigner(i: number) {
    setSigners(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateSigner<K extends keyof SignerRow>(i: number, key: K, value: SignerRow[K]) {
    setSigners(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const realSigners = signers.filter(s => s.role === "signer" && s.name && s.email)
    if (realSigners.length === 0) {
      setError("Lägg till minst en signerare")
      return
    }

    setSaving(true)
    const res = await fetch("/api/signatures", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        title:      title.trim(),
        message:    message.trim() || null,
        expiresAt:  new Date(expiresAt).toISOString(),
        signers:    signers.filter(s => s.name && s.email),
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      onCreated()
      onClose()
    } else {
      setError(typeof data.error === "string" ? data.error : "Något gick fel")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Skicka för signering</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Dokumenttitel</label>
            <input className={CLS} value={title} onChange={e => setTitle(e.target.value)} required maxLength={300} />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Meddelande till signerare (valfri)</label>
            <textarea
              className={`${CLS} min-h-[72px] resize-none`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hej, vänligen granska och signera bifogat dokument…"
              maxLength={2000}
            />
          </div>

          {/* Expires */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Giltig till</label>
            <input type="date" className={CLS} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} required />
          </div>

          {/* Signers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600">Signerare</label>
              <button
                type="button"
                onClick={addSigner}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Lägg till
              </button>
            </div>

            {signers.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-start">
                <input
                  className={CLS}
                  placeholder="Namn"
                  value={s.name}
                  onChange={e => updateSigner(i, "name", e.target.value)}
                  maxLength={200}
                />
                <input
                  className={CLS}
                  placeholder="E-post"
                  type="email"
                  value={s.email}
                  onChange={e => updateSigner(i, "email", e.target.value)}
                />
                <select
                  className="px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={s.role}
                  onChange={e => updateSigner(i, "role", e.target.value as "signer" | "cc")}
                >
                  <option value="signer">Signerar</option>
                  <option value="cc">Kopia</option>
                </select>
                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSigner(i)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none pt-1.5"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Skickar…" : "Skicka för signering"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
