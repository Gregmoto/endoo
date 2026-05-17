"use client"

import Link from "next/link"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { CameraCapture } from "@/components/ui/CameraCapture"
import { useState } from "react"

interface QuickCreateSheetProps {
  open:     boolean
  onClose:  () => void
  orgSlug:  string
}

type QuickAction = {
  icon:        string
  label:       string
  description: string
  href?:       string
  action?:     "camera"
  color:       string
}

const ACTIONS: QuickAction[] = [
  {
    icon:        "◧",
    label:       "Ny faktura",
    description: "Skapa och skicka faktura",
    href:        "/invoices/new",
    color:       "bg-blue-50 text-blue-600",
  },
  {
    icon:        "📷",
    label:       "Skanna kvitto",
    description: "Kamera → utlägg automatiskt",
    action:      "camera",
    color:       "bg-green-50 text-green-600",
  },
  {
    icon:        "◈",
    label:       "Ny kund",
    description: "Lägg till kund eller kontakt",
    href:        "/contacts/new",
    color:       "bg-purple-50 text-purple-600",
  },
  {
    icon:        "◨",
    label:       "Ny lev.faktura",
    description: "Registrera leverantörsfaktura",
    href:        "/supplier-invoices/new",
    color:       "bg-orange-50 text-orange-600",
  },
]

export function QuickCreateSheet({ open, onClose, orgSlug }: QuickCreateSheetProps) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const base = `/${orgSlug}`

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Skapa nytt" maxHeight="60vh">
        <div className="p-4 grid grid-cols-2 gap-3">
          {ACTIONS.map((action) => {
            const content = (
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 active:scale-95 transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${action.color}`}>
                  {action.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
                </div>
              </div>
            )

            if (action.action === "camera") {
              return (
                <button
                  key="camera"
                  onClick={() => { onClose(); setTimeout(() => setCameraOpen(true), 150) }}
                  className="text-left"
                >
                  {content}
                </button>
              )
            }

            return (
              <Link key={action.href} href={`${base}${action.href}`} onClick={onClose}>
                {content}
              </Link>
            )
          })}
        </div>
      </BottomSheet>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} orgSlug={orgSlug} />
    </>
  )
}
