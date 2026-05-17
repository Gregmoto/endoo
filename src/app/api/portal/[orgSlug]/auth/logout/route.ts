/**
 * POST /api/portal/[orgSlug]/auth/logout
 * Clear the portal session cookie.
 */

import { cookies }      from "next/headers"
import { PORTAL_COOKIE } from "@/lib/portal/auth"
import { NextResponse }  from "next/server"

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const cookieStore = await cookies()

  cookieStore.set(PORTAL_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  })

  return NextResponse.redirect(`${BASE_URL}/portal/${orgSlug}/login`)
}
