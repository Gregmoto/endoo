"use client"

import { useEffect, useState } from "react"
import { NotificationDrawer } from "./NotificationDrawer"

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true&limit=1")
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silently ignore network errors
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    const id = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(id)
  }, [])

  function handleRead() {
    fetchUnreadCount()
  }

  const badge = unreadCount > 99 ? "99+" : String(unreadCount)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Notifikationer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {badge}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRead={handleRead}
      />
    </>
  )
}
