"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

const AiContext = createContext<{
  open: boolean
  setOpen: (v: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export function AiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <AiContext.Provider value={{ open, setOpen }}>
      {children}
    </AiContext.Provider>
  )
}

export const useAi = () => useContext(AiContext)
