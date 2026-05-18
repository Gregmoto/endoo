"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type ConsentState = {
  necessary: true
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = "endoo_cookie_consent"

function loadConsent(): ConsentState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveConsent(state: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = loadConsent()
    if (!existing) setVisible(true)
  }, [])

  if (!visible) return null

  function acceptAll() {
    const state: ConsentState = { necessary: true, analytics: true, marketing: true }
    saveConsent(state)
    setVisible(false)
  }

  function rejectOptional() {
    const state: ConsentState = { necessary: true, analytics: false, marketing: false }
    saveConsent(state)
    setVisible(false)
  }

  function saveCustom() {
    const state: ConsentState = { necessary: true, analytics, marketing }
    saveConsent(state)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-5 pointer-events-auto">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Vi använder cookies 🍪</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Vi använder nödvändiga cookies för att sidan ska fungera. Du kan även tillåta analys- och marknadsföringscookies.{" "}
                <button onClick={() => setShowDetails(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Anpassa
                </button>
                {" · "}
                <Link href="/cookies" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Läs mer
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={rejectOptional}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors"
              >
                Neka
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Acceptera alla
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cookie-inställningar</p>
              <button onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3 mb-5">
              {/* Necessary */}
              <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Nödvändiga</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Session, inloggning och säkerhet. Kan inte inaktiveras.</p>
                </div>
                <div className="w-8 h-4 bg-indigo-600 rounded-full flex-shrink-0 mt-0.5" title="Alltid aktiv" />
              </div>

              {/* Analytics */}
              <label className="flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Analys</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hjälper oss förstå hur sidan används. Ingen personidentifiering.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics(v => !v)}
                  className={`relative w-8 h-4 rounded-full flex-shrink-0 mt-0.5 transition-colors ${analytics ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white dark:bg-white rounded-full shadow transition-transform ${analytics ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </label>

              {/* Marketing */}
              <label className="flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Marknadsföring</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Används för riktad marknadsföring och remarketing.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={marketing}
                  onClick={() => setMarketing(v => !v)}
                  className={`relative w-8 h-4 rounded-full flex-shrink-0 mt-0.5 transition-colors ${marketing ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white dark:bg-white rounded-full shadow transition-transform ${marketing ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={rejectOptional}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors"
              >
                Neka alla
              </button>
              <button
                onClick={saveCustom}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Spara val
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Call this to open cookie settings from footer/settings */
export function openCookieSettings() {
  localStorage.removeItem(STORAGE_KEY)
  window.location.reload()
}
