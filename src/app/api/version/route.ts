import { NextResponse } from "next/server"
import { getVersionInfo } from "@/lib/version"

export const dynamic = "force-dynamic"

export async function GET() {
  const info = getVersionInfo()
  return NextResponse.json({
    ...info,
    uptime: process.uptime ? Math.floor(process.uptime()) : null,
  })
}
