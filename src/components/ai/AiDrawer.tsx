"use client"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { useAi } from "./AiContext"

type Message = { role: "user" | "assistant"; content: string }

const QUICK_CHIPS = [
  "Vad är min moms just nu?",
  "Förklara konto 2640",
  "Hur bokför jag fika?",
  "Sammanfatta resultatet",
  "Vilka fakturor är obetalda?",
]

// Simple markdown-like renderer: **bold**, newlines → <br>, "- " bullets
function renderContent(text: string): React.ReactNode {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    const parts = line
      .split(/(\*\*[^*]+\*\*)/)
      .map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>
        }
        return part
      })

    const isBullet = line.startsWith("- ") || line.startsWith("• ")
    const content = isBullet
      ? [<span key="bullet">• </span>, ...parts.slice(isBullet && line.startsWith("- ") ? 1 : 1)]
      : parts

    return (
      <span key={i}>
        {isBullet ? (
          <span className="flex gap-1">
            <span className="shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </span>
        ) : (
          <span>{parts}</span>
        )}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })
}

export function AiDrawer() {
  const { open, setOpen } = useAi()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  async function send(content: string) {
    if (!content.trim() || loading) return

    const newMessages: Message[] = [
      ...messages,
      { role: "user" as const, content: content.trim() },
    ]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) {
        throw new Error("Network error")
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string }
            if (parsed.text) {
              fullText += parsed.text
              setStreamingText(fullText)
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: fullText },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "Något gick fel. Försök igen.",
        },
      ])
    } finally {
      setStreamingText("")
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const showEmpty = messages.length === 0 && !loading

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 text-lg">✦</span>
            <span className="font-semibold text-gray-900">Endoo AI</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕ Stäng
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {showEmpty && (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-4 text-sm text-gray-700">
                <p className="font-medium text-indigo-800 mb-1">Hej! Jag kan hjälpa dig med bokföring.</p>
                <p className="text-gray-600">Ställ en fråga om dina konton, moms, fakturor eller konteringar.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full transition-colors border border-gray-200 hover:border-indigo-200"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.role === "assistant"
                  ? renderContent(msg.content)
                  : msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-gray-100 text-gray-800 leading-relaxed">
                {streamingText ? (
                  renderContent(streamingText)
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    Analyserar
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv en fråga…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 max-h-32"
              style={{ minHeight: "38px" }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Skicka
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Enter för att skicka · Shift+Enter för ny rad
          </p>
        </div>
      </div>
    </>
  )
}
