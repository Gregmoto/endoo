"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { WIDGET_CONFIG, type WidgetId } from "@/lib/dashboard/widget-config"

interface Props {
  open:    boolean
  onClose: () => void
  hidden:  WidgetId[]
  onSave:  (hidden: WidgetId[]) => void
}

export function CustomizeModal({ open, onClose, hidden, onSave }: Props) {
  const [local, setLocal] = useState<WidgetId[]>(hidden)

  if (!open) return null

  function toggle(id: WidgetId) {
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Anpassa dashboard</h2>
        <ul className="space-y-2 mb-6">
          {WIDGET_CONFIG.map(w => (
            <li key={w.id}>
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={!local.includes(w.id)}
                  onChange={() => toggle(w.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">{w.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button onClick={() => { onSave(local); onClose() }}>Spara</Button>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
        </div>
      </div>
    </div>
  )
}
