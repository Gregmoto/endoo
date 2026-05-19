"use client"

import { useState } from "react"

const chevronDown = "M5 8l5 5 5-5"
const chevronRight = "M8 5l5 5-5 5"

interface SectionProps {
  title:        string
  defaultOpen?: boolean
  children:     React.ReactNode
}

export function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground flex-shrink-0">
          <path d={open ? chevronDown : chevronRight} />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3 bg-background">
          {children}
        </div>
      )}
    </div>
  )
}

const fieldCls = "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

interface FieldProps {
  label:    string
  hint?:    string
  children: React.ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

export function TextInput({
  value, onChange, placeholder, className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className ?? fieldCls}
    />
  )
}

export function TextArea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={fieldCls + " resize-none"}
    />
  )
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={[
          "relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        ].join(" ")}
      >
        <span className={[
          "absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")} />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
