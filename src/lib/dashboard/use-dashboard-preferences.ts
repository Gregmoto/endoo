"use client"
import { useState, useEffect } from "react"
import type { WidgetId } from "./widget-config"

export function useDashboardPreferences() {
  const [hidden, setHidden] = useState<WidgetId[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/dashboard/preferences")
      .then(r => r.ok ? r.json() : { hiddenWidgets: [] })
      .then(d => { setHidden(d.hiddenWidgets ?? []); setLoaded(true) })
  }, [])

  async function save(hiddenWidgets: WidgetId[]) {
    setHidden(hiddenWidgets)
    await fetch("/api/dashboard/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenWidgets }),
    })
  }

  return { hidden, loaded, save }
}
