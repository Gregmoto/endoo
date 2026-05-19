"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { CalendarEventModal } from "@/components/dashboard/widgets/CalendarEventModal"
import { DEFAULT_EVENT_COLOR } from "@/lib/calendar/colors"
import Link from "next/link"

type CalEvent = { id: string; title: string; startAt: string; endAt: string | null; allDay: boolean; color: string | null }

const MONTH_NAMES = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
const DAY_LABELS  = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"]

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

export default function CalendarPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const today   = new Date()

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents]   = useState<CalEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const loadEvents = useCallback(() => {
    const from = new Date(year, month, 1).toISOString().slice(0, 10)
    const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    fetch(`/api/calendar/events?from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events ?? []))
  }, [year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

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

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}`} className="text-sm text-muted-foreground hover:text-foreground">← Översikt</Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">Kalender</h1>
        <button
          onClick={() => { setSelectedDate(null); setShowModal(true) }}
          className="ml-auto text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          + Lägg till
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">‹</button>
          <h2 className="text-lg font-semibold text-foreground">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">›</button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l border-border">
          {cells.map((day, i) => {
            const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const dayEvents = day ? (eventsByDay[day] ?? []) : []
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null

            return (
              <div
                key={i}
                onClick={() => { if (dateStr) { setSelectedDate(dateStr); setShowModal(true) } }}
                className="border-r border-b border-border min-h-[80px] p-1 cursor-pointer hover:bg-accent/30 transition-colors"
              >
                {day && (
                  <>
                    <div className={[
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1",
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground",
                    ].join(" ")}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate text-primary-foreground"
                          style={{ backgroundColor: ev.color ?? DEFAULT_EVENT_COLOR }}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} till</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <CalendarEventModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={loadEvents}
        initialDate={selectedDate ?? undefined}
      />
    </div>
  )
}
