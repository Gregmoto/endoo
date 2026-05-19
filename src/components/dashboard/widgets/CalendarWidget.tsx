"use client"
import { useState, useEffect, useCallback } from "react"
import { CalendarEventModal } from "./CalendarEventModal"
import { DEFAULT_EVENT_COLOR } from "@/lib/calendar/colors"

type CalEvent = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  color: string | null
  shareWithAll: boolean
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
const DAY_LABELS  = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"]

export function CalendarWidget({ orgSlug }: { orgSlug: string }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalEvent[]>([])
  const [showDayPopup, setShowDayPopup] = useState(false)

  const loadEvents = useCallback(() => {
    const from = new Date(year, month, 1).toISOString().slice(0, 10)
    const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    fetch(`/api/calendar/events?from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events ?? []))
  }, [year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstWeekDay = getFirstDayOfMonth(year, month)

  const eventsByDay: Record<number, CalEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.startAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(ev)
    }
  }

  function clickDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
    const dayEvs = eventsByDay[day] ?? []
    if (dayEvs.length > 0) {
      setSelectedDayEvents(dayEvs)
      setShowDayPopup(true)
    } else {
      setShowModal(true)
    }
  }

  const upcomingEvents = events
    .filter(e => new Date(e.startAt) >= today)
    .slice(0, 5)

  function fmtEventTime(ev: CalEvent) {
    const d = new Date(ev.startAt)
    if (ev.allDay) {
      const isToday = d.toDateString() === today.toDateString()
      if (isToday) return "Idag"
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
      if (d.toDateString() === tomorrow.toDateString()) return "Imor"
      return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })
    }
    const isToday = d.toDateString() === today.toDateString()
    const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
    if (isToday) return `Idag ${time}`
    return `${d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric" })} ${time}`
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Kalender</h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors">‹</button>
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px -mt-2">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const hasEvents = !!eventsByDay[day]?.length
          return (
            <button
              key={day}
              onClick={() => clickDay(day)}
              className={[
                "flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-full text-xs transition-colors",
                isToday ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent text-foreground",
              ].join(" ")}
            >
              {day}
              {hasEvents && !isToday && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {upcomingEvents.length > 0 && (
        <div className="border-t border-border/50 pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Kommande</p>
          {upcomingEvents.map(ev => (
            <div key={ev.id} className="flex items-center gap-2 text-sm py-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: ev.color ?? DEFAULT_EVENT_COLOR }}
              />
              <span className="text-muted-foreground text-xs flex-shrink-0 w-20">{fmtEventTime(ev)}</span>
              <span className="text-foreground truncate">{ev.title}</span>
            </div>
          ))}
        </div>
      )}

      {showDayPopup && (
        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">{selectedDate}</p>
            <button onClick={() => setShowDayPopup(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
          <ul className="space-y-1">
            {selectedDayEvents.map(ev => (
              <li key={ev.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color ?? DEFAULT_EVENT_COLOR }} />
                <span className="text-foreground">{ev.title}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setShowDayPopup(false); setShowModal(true) }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            + Lägg till händelse denna dag
          </button>
        </div>
      )}

      <button
        onClick={() => { setSelectedDate(null); setShowModal(true) }}
        className="text-xs text-primary hover:underline text-left"
      >
        + Lägg till händelse
      </button>

      <CalendarEventModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={loadEvents}
        initialDate={selectedDate ?? undefined}
      />
    </div>
  )
}
