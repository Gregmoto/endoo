"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CALENDAR_EVENT_COLORS, DEFAULT_EVENT_COLOR } from "@/lib/calendar/colors"

type Member = { id: string; fullName: string }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  initialDate?: string
}

export function CalendarEventModal({ open, onClose, onCreated, initialDate }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const defaultDate = initialDate ?? new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    title: "",
    startDate: defaultDate,
    startTime: "09:00",
    endDate: defaultDate,
    endTime: "10:00",
    allDay: false,
    location: "",
    description: "",
    sharing: "private" as "private" | "team" | "specific",
    attendeeIds: [] as string[],
    color: DEFAULT_EVENT_COLOR as string,
  })

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, startDate: initialDate ?? defaultDate, endDate: initialDate ?? defaultDate, title: "" }))
      setError("")
      fetch("/api/team/members").then(r => r.ok ? r.json() : { members: [] }).then(d => setMembers(d.members ?? []))
    }
  }, [open, initialDate]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const startAt = form.allDay
      ? new Date(`${form.startDate}T00:00:00`).toISOString()
      : new Date(`${form.startDate}T${form.startTime}`).toISOString()
    const endAt = form.allDay
      ? new Date(`${form.endDate}T23:59:59`).toISOString()
      : new Date(`${form.endDate}T${form.endTime}`).toISOString()

    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        startAt,
        endAt,
        allDay: form.allDay,
        location: form.location || null,
        color: form.color,
        shareWithAll: form.sharing === "team",
        attendeeIds: form.sharing === "specific" ? form.attendeeIds : [],
      }),
    })

    if (res.ok) {
      onCreated()
      onClose()
    } else {
      const d = await res.json()
      setError(d.error ?? "Något gick fel")
    }
    setSaving(false)
  }

  const inp = "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-4">Lägg till händelse</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Titel *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="Händelsetitel…" />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.allDay} onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))} />
              Heldag
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Startdatum</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inp} />
            </div>
            {!form.allDay && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Starttid</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inp} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Slutdatum</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inp} />
            </div>
            {!form.allDay && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sluttid</label>
                <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className={inp} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Plats</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inp} placeholder="Valfritt…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beskrivning</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Delning</label>
            <div className="space-y-1.5">
              {([
                ["private",  "Privat (bara jag)"],
                ["team",     "Hela teamet"],
                ["specific", "Specifika personer"],
              ] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="sharing" value={val} checked={form.sharing === val}
                    onChange={() => setForm(f => ({ ...f, sharing: val }))} />
                  {lbl}
                </label>
              ))}
            </div>
            {form.sharing === "specific" && members.length > 0 && (
              <div className="mt-2 border border-input rounded-lg max-h-32 overflow-y-auto">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.attendeeIds.includes(m.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        attendeeIds: e.target.checked
                          ? [...f.attendeeIds, m.id]
                          : f.attendeeIds.filter(id => id !== m.id),
                      }))}
                    />
                    <span className="text-sm text-foreground">{m.fullName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Färg</label>
            <div className="flex gap-2">
              {CALENDAR_EVENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : undefined, outlineOffset: "2px" }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara händelse"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
