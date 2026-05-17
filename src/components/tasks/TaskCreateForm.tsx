"use client"

import { useState } from "react"
import type { Task, TaskEntityType, TaskPriority } from "./types"
import { PRIORITY_LABELS } from "./types"

interface Props {
  orgSlug:      string
  entityType?:  TaskEntityType
  entityId?:    string
  entityLabel?: string
  onCreated:    (task: Task) => void
  onCancel:     () => void
}

export function TaskCreateForm({ entityType, entityId, entityLabel, onCreated, onCancel }: Props) {
  const [title,    setTitle]    = useState("")
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [dueDate,  setDueDate]  = useState("")
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title: title.trim(),
          priority,
          entityType: entityType ?? undefined,
          entityId:   entityId   ?? undefined,
          dueDate:    dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        onCreated(await res.json())
      } else {
        const d = await res.json()
        setError(d.error ?? "Kunde inte skapa uppgift")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      {entityLabel && (
        <p className="text-[10px] text-gray-400">Kopplad till: <span className="font-medium text-gray-600">{entityLabel}</span></p>
      )}

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Uppgiftens titel…"
        autoFocus
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
      />

      <div className="flex gap-2">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as TaskPriority)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
        >
          {(["low","normal","high","urgent"] as TaskPriority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="text-xs font-semibold px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Sparar…" : "Skapa"}
        </button>
      </div>
    </form>
  )
}
