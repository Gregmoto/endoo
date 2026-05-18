"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  open:       boolean
  onClose:    () => void
  title?:     string
  children:   React.ReactNode
  /** Extra classes on the panel itself */
  className?: string
  /** How much of the viewport height to use. Default 90vh. */
  maxHeight?: string
}

/**
 * Mobile-first bottom sheet.
 *
 * - Slides up from the bottom with a smooth spring transition
 * - Backdrop tap / Escape key → closes
 * - Drag handle bar shown at the top
 * - Safe-area-aware bottom padding for notched iPhones
 * - Works fine on desktop too (centered, max-width constrained)
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  maxHeight = "90vh",
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label={title}
        style={{ maxHeight }}
        className={cn(
          "relative w-full md:max-w-lg md:rounded-2xl",
          "rounded-t-2xl bg-card shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-slide-up",
          className,
        )}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 pt-1 border-b border">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Stäng"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  )
}
