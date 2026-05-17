"use client"

import { type ReactNode } from "react"
import { AiProvider } from "./AiContext"
import { AiDrawer } from "./AiDrawer"
import { AiButton } from "./AiButton"

export function AiShell({ children }: { children: ReactNode }) {
  return (
    <AiProvider>
      {/* Fixed AI button top-right */}
      <div className="fixed top-0 right-0 z-30 p-3">
        <AiButton />
      </div>
      {children}
      <AiDrawer />
    </AiProvider>
  )
}
