import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/rbac/guards"
import { requireFeature } from "@/lib/plans/guard"
import { handleApiError } from "@/lib/api/handle-error"
import { buildAiContext } from "@/services/ai/context-builder"
import { buildSystemPrompt } from "@/services/ai/system-prompt"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Message = { role: "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    await requireFeature(ctx.organizationId, "ai_assistant")
    const { messages }: { messages: Message[] } = await req.json()

    if (!messages?.length) {
      return Response.json({ error: "No messages" }, { status: 400 })
    }

    // Sanitize user messages (prevent prompt injection)
    const sanitized: Message[] = messages.map((m) => ({
      role: m.role,
      content: m.content
        .replace(/<\/?system>/gi, "")
        .replace(/###/g, "")
        .slice(0, 2000),
    }))

    // Build context from latest user message
    const lastUserMsg =
      [...sanitized].reverse().find((m) => m.role === "user")?.content ?? ""
    const context = await buildAiContext(ctx.organizationId, lastUserMsg)

    const { prisma } = await import("@/lib/prisma")
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true },
    })

    const systemPrompt = buildSystemPrompt(org?.name ?? "organisationen", context)

    // Stream response using Server-Sent Events
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: sanitized.slice(-10),
    })

    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              )
            }
          }
          controller.enqueue(enc.encode("data: [DONE]\n\n"))
        } catch {
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    })
  } catch (err) {
    return handleApiError(err, "ai/chat")
  }
}
