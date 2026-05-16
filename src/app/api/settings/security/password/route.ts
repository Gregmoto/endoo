/**
 * PATCH /api/settings/security/password — change password for current user
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { auth } from "@/lib/auth"
import { z } from "zod"
import bcrypt from "bcryptjs"

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
})

export async function PATCH(req: Request) {
  try {
    await requireAuth()
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Ej inloggad" }, { status: 401 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    // Load credentials account
    const account = await prisma.userAccount.findFirst({
      where: { userId: session.user.id, provider: "credentials" },
    })

    if (!account) {
      return Response.json({ error: "Inget lösenordskonto hittat" }, { status: 400 })
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, account.providerAccountId)
    if (!valid) {
      return Response.json({ error: "Nuvarande lösenord är felaktigt" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.userAccount.update({
      where: { id: account.id },
      data: { providerAccountId: hashed },
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[security/password]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
