"use client"

import { useEffect, useState } from "react"

interface Notification {
  id: string
  title: string
  body: string
  href: string | null
  iconKey: string | null
  category: string | null
  readAt: string | null
  createdAt: string
  dismissedAt: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onRead: () => void
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just nu"
  if (mins < 60) return `${mins} min sedan`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h sedan`
  const days = Math.floor(hours / 24)
  if (days === 1) return "igår"
  if (days < 7) return `${days} dagar sedan`
  return new Date(date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}

type Status = "idle" | "loading" | "error"

export function NotificationDrawer({ isOpen, onClose, onRead }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [markingAll, setMarkingAll] = useState(false)

  async function fetchNotifications() {
    setStatus("loading")
    try {
      const res = await fetch("/api/notifications?limit=20")
      if (!res.ok) throw new Error("fetch failed")
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  async function markRead(notification: Notification) {
    if (!notification.readAt) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" })
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n
          )
        )
        onRead()
      } catch {
        // ignore
      }
    }
    if (notification.href) {
      window.location.href = notification.href
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch("/api/notifications/read-all", { method: "POST" })
      await fetchNotifications()
      onRead()
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const hasUnread = notifications.some((n) => n.readAt === null)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-sm bg-white shadow-xl z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Notifikationer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Notifikationer</h2>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
              >
                {markingAll ? "Markerar…" : "Markera alla som lästa"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Stäng"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {status === "loading" && (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <p className="text-sm text-gray-500">Kunde inte ladda notifikationer.</p>
              <button
                onClick={fetchNotifications}
                className="mt-3 text-xs text-indigo-600 hover:underline"
              >
                Försök igen
              </button>
            </div>
          )}

          {status === "idle" && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-300 mb-3"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-sm font-medium text-gray-500">Inga notifikationer</p>
              <p className="text-xs text-gray-400 mt-1">Du är helt à jour!</p>
            </div>
          )}

          {status === "idle" && notifications.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {notifications.map((n) => {
                const isUnread = n.readAt === null
                const isClickable = !!n.href || isUnread

                return (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n)}
                      disabled={!isClickable}
                      className={`w-full text-left px-5 py-4 transition-colors ${
                        isUnread
                          ? "bg-indigo-50 hover:bg-indigo-100"
                          : "bg-white hover:bg-gray-50"
                      } ${!isClickable ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm truncate ${
                              isUnread
                                ? "font-semibold text-gray-900"
                                : "font-medium text-gray-700"
                            }`}
                          >
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                        </div>
                        {isUnread && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {relativeTime(n.createdAt)}
                        {n.category && (
                          <span className="ml-2 capitalize">{n.category}</span>
                        )}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
