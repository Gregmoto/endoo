import Anthropic from "@anthropic-ai/sdk"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import type { AiFeature } from "./types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = "claude-sonnet-4-6"

interface CallOptions {
  organizationId: string
  userId?:        string
  feature:        AiFeature
  systemPrompt:   string
  userMessage:    string
  maxTokens?:     number
}

interface CallResult<T> {
  data:            T
  promptTokens:    number
  completionTokens: number
  latencyMs:       number
}

export async function callStructured<T>(opts: CallOptions): Promise<CallResult<T>> {
  const start = Date.now()
  const inputHash = createHash("sha256").update(opts.userMessage).digest("hex")

  try {
    const msg = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      system:     opts.systemPrompt,
      messages:   [{ role: "user", content: opts.userMessage }],
    })

    const latencyMs       = Date.now() - start
    const promptTokens    = msg.usage.input_tokens
    const completionTokens = msg.usage.output_tokens

    // Extract text
    const rawText = msg.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")

    // Strip any accidental markdown fences
    const jsonText = rawText
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim()

    const data = JSON.parse(jsonText) as T

    // Fire-and-forget audit log
    prisma.aiLog.create({
      data: {
        organizationId: opts.organizationId,
        userId:         opts.userId,
        feature:        opts.feature,
        inputHash,
        tokensUsed:     promptTokens + completionTokens,
        latencyMs,
        success:        true,
      },
    }).catch(() => {/* non-critical */})

    return { data, promptTokens, completionTokens, latencyMs }
  } catch (err) {
    const latencyMs = Date.now() - start

    prisma.aiLog.create({
      data: {
        organizationId: opts.organizationId,
        userId:         opts.userId,
        feature:        opts.feature,
        inputHash,
        tokensUsed:     0,
        latencyMs,
        success:        false,
        errorMessage:   err instanceof Error ? err.message : String(err),
      },
    }).catch(() => {/* non-critical */})

    throw err
  }
}

export async function callVision<T>(opts: {
  organizationId: string
  userId?:        string
  feature:        AiFeature
  systemPrompt:   string
  textPrompt:     string
  imageBase64:    string
  mediaType:      "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  maxTokens?:     number
}): Promise<CallResult<T>> {
  const start     = Date.now()
  const inputHash = createHash("sha256").update(opts.imageBase64.slice(0, 200)).digest("hex")

  try {
    const msg = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      system:     opts.systemPrompt,
      messages: [{
        role:    "user",
        content: [
          {
            type:   "image",
            source: { type: "base64", media_type: opts.mediaType, data: opts.imageBase64 },
          },
          { type: "text", text: opts.textPrompt },
        ],
      }],
    })

    const latencyMs        = Date.now() - start
    const promptTokens     = msg.usage.input_tokens
    const completionTokens = msg.usage.output_tokens

    const rawText = msg.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")

    const jsonText = rawText
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim()

    const data = JSON.parse(jsonText) as T

    prisma.aiLog.create({
      data: {
        organizationId: opts.organizationId,
        userId:         opts.userId,
        feature:        opts.feature,
        inputHash,
        tokensUsed:     promptTokens + completionTokens,
        latencyMs,
        success:        true,
      },
    }).catch(() => {/* non-critical */})

    return { data, promptTokens, completionTokens, latencyMs }
  } catch (err) {
    const latencyMs = Date.now() - start

    prisma.aiLog.create({
      data: {
        organizationId: opts.organizationId,
        userId:         opts.userId,
        feature:        opts.feature,
        inputHash,
        tokensUsed:     0,
        latencyMs,
        success:        false,
        errorMessage:   err instanceof Error ? err.message : String(err),
      },
    }).catch(() => {/* non-critical */})

    throw err
  }
}
