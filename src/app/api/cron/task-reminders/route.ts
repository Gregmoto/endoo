import { prisma } from "@/lib/prisma"

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return false
  const secret = process.env.CRON_SECRET
  const fromHeader = req.headers.get("x-cron-secret")
  if (fromHeader === secret) return true
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (bearer === secret) return true
  return false
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  const tasks = await prisma.task.findMany({
    where: {
      deletedAt:  null,
      status:     { notIn: ["done", "cancelled"] },
      remindAt:   { lte: now },
      remindedAt: null,
    },
    select: {
      id:             true,
      organizationId: true,
      title:          true,
      dueDate:        true,
    },
    take: 500,
  })

  let fired = 0, failed = 0

  for (const task of tasks) {
    try {
      await prisma.task.update({
        where: { id: task.id },
        data:  { remindedAt: now },
      })
      fired++
    } catch (err) {
      failed++
      console.error(`[cron/task-reminders] failed for task ${task.id}:`, err)
    }
  }

  console.log(`[cron/task-reminders] total=${tasks.length} fired=${fired} failed=${failed}`)
  return Response.json({ total: tasks.length, fired, failed })
}

export const GET  = handle
export const POST = handle
