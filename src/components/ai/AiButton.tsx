"use client"

import { useAi } from "./AiContext"

export function AiButton() {
  const { setOpen } = useAi()
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
    >
      <span className="text-base leading-none">✦</span>
      AI-assistent
    </button>
  )
}
