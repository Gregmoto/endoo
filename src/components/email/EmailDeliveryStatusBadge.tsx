"use client"

import { useState, useEffect } from "react"

type DeliveryStatus = {
  status:      string
  openedAt:    string | null
  clickedAt:   string | null
  deliveredAt: string | null
  bouncedAt:   string | null
  createdAt:   string
} | null

const LABEL: Record<string, { text: string; cls: string }> = {
  queued:    { text: "I kö",        cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
  sent:      { text: "Skickat",     cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
  delivered: { text: "Levererat",   cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" },
  opened:    { text: "Öppnat",      cls: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400" },
  clicked:   { text: "Klickat",     cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" },
  bounced:   { text: "Returnerat",  cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" },
  complained:{ text: "Klagomål",    cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" },
  delayed:   { text: "Fördröjt",    cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
}

export function EmailDeliveryStatusBadge({ invoiceId }: { invoiceId: string }) {
  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null)

  useEffect(() => {
    fetch(`/api/invoices/${invoiceId}/email-delivery`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDelivery(d ?? null))
  }, [invoiceId])

  if (!delivery) return null

  const info = LABEL[delivery.status] ?? LABEL.sent

  return (
    <div className="flex items-center gap-1.5" title={`Senaste utskick: ${new Date(delivery.createdAt).toLocaleString("sv-SE")}`}>
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${info.cls}`}>
        ✉ {info.text}
      </span>
      {delivery.bouncedAt && (
        <span className="text-[11px] text-red-500 dark:text-red-400 font-medium">
          — e-post returnerad
        </span>
      )}
    </div>
  )
}
