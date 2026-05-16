/**
 * GET /api/settings/security/sessions
 *
 * Returns info about the current JWT session.
 * The app uses JWT strategy (no DB session rows), so only
 * the current session is accessible.
 */

import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Ej inloggad" }, { status: 401 })

  return Response.json({
    current: {
      userId:    session.user.id,
      email:     session.user.email,
      issuedAt:  null, // JWT iat not exposed via session object
    },
    note: "JWT-baserade sessioner — varje enhet håller sin token lokalt.",
  })
}
