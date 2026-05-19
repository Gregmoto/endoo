"use client"

import { useState, useEffect } from "react"

export type OrgCurrency = {
  id:        string
  code:      string
  symbol:    string | null
  isActive:  boolean
  isDefault: boolean
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<OrgCurrency[]>([])
  const [isLoading,  setIsLoading]  = useState(true)

  useEffect(() => {
    fetch("/api/settings/currencies?active=true")
      .then(r => r.ok ? r.json() : [])
      .then((data: OrgCurrency[]) => {
        setCurrencies(Array.isArray(data) ? data : [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const defaultCurrency = currencies.find(c => c.isDefault)?.code ?? "SEK"

  return { currencies, defaultCurrency, isLoading }
}
