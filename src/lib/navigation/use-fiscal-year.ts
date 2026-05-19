"use client"

import { useState, useEffect } from "react"

function lsKey(orgId: string) {
  return `endoo:fiscal-year:${orgId}`
}

export function useFiscalYear(orgId: string) {
  const [year, setYear] = useState<number>(() => {
    if (typeof window === "undefined") return new Date().getFullYear()
    const stored = localStorage.getItem(lsKey(orgId))
    return stored ? parseInt(stored, 10) : new Date().getFullYear()
  })

  useEffect(() => {
    localStorage.setItem(lsKey(orgId), String(year))
  }, [orgId, year])

  return { year, setYear }
}
