import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { APP_VERSION } from "@/lib/version"

export const dynamic = "force-dynamic"

async function checkDatabase(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return "ok"
  } catch {
    return "error"
  }
}

function checkStorage(): "ok" | "unconfigured" {
  return process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "unconfigured"
}

function checkEmail(): "ok" | "unconfigured" {
  return process.env.RESEND_API_KEY ? "ok" : "unconfigured"
}

export async function GET() {
  const [database] = await Promise.all([checkDatabase()])

  const storage = checkStorage()
  const email = checkEmail()

  const allOk = database === "ok"
  const status = allOk ? "ok" : "degraded"

  const body = {
    status,
    version: APP_VERSION,
    checks: { database, storage, email },
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(body, { status: allOk ? 200 : 503 })
}
