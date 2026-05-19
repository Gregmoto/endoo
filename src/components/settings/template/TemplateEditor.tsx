"use client"

import { useState, useEffect } from "react"
import { TemplateForm }    from "./TemplateForm"
import { TemplatePreview } from "./TemplatePreview"
import { Button }          from "@/components/ui/button"
import { formFromTemplate, EMPTY_FORM, type TemplateFormValues } from "./types"

interface Toast { message: string; type: "success" | "error" }

interface Props {
  orgSlug: string
}

export function TemplateEditor({ orgSlug }: Props) {
  const [form, setForm]       = useState<TemplateFormValues>(EMPTY_FORM)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")
  const [toast, setToast]     = useState<Toast | null>(null)

  // Load default (or first) template on mount
  useEffect(() => {
    fetch("/api/settings/invoice-templates")
      .then(r => r.ok ? r.json() : [])
      .then((templates: unknown[]) => {
        if (Array.isArray(templates) && templates.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const def = (templates as any[]).find(t => t.isDefault) ?? templates[0] as any
          setTemplateId(def.id)
          setForm(formFromTemplate(def))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function patch(updates: Partial<TemplateFormValues>) {
    setForm(f => ({ ...f, ...updates }))
  }

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    const body = {
      ...form,
      postalAddress:  form.postalAddress  || null,
      streetAddress:  form.streetAddress  || null,
      phone:          form.phone          || null,
      fax:            form.fax            || null,
      email:          form.email          || null,
      website:        form.website        || null,
      bankgiro:       form.bankgiro       || null,
      plusgiro:       form.plusgiro       || null,
      iban:           form.iban           || null,
      bic:            form.bic            || null,
      vatNumber:      form.vatNumber      || null,
      swishNumber:    form.swishNumber    || null,
      boardSeat:      form.boardSeat      || null,
      footerText:     form.footerText     || null,
      logoUrl:        form.logoUrl        || null,
    }

    const isNew = !templateId
    const url   = isNew
      ? "/api/settings/invoice-templates"
      : `/api/settings/invoice-templates/${templateId}`

    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const saved = await res.json()
      if (isNew) setTemplateId(saved.id)
      showToast("Mallen sparad", "success")
    } else {
      const d = await res.json().catch(() => ({}))
      const msg = d.error ?? "Något gick fel"
      setError(msg)
      showToast(msg, "error")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative">

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left — form */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Inställningar</h2>
          <TemplateForm form={form} onChange={patch} />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Sparar…" : "Spara"}
            </Button>
            {!templateId && (
              <p className="text-xs text-muted-foreground">Ingen mall sparad ännu</p>
            )}
          </div>
        </div>

        {/* Right — sticky preview */}
        <div className="lg:sticky lg:top-4" style={{ minHeight: 600 }}>
          <h2 className="text-base font-semibold text-foreground mb-3">Förhandsvisning</h2>
          <TemplatePreview form={form} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={[
          "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium",
          "transition-all duration-200",
          toast.type === "success"
            ? "bg-primary text-primary-foreground"
            : "bg-destructive text-destructive-foreground",
        ].join(" ")}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
