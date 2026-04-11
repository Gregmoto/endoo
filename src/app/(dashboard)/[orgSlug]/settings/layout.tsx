import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SettingsNav } from "./_nav"

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { type: true },
  })

  return (
    <div className="flex min-h-screen">
      <SettingsNav
        orgSlug={orgSlug}
        isAgency={org?.type === "agency"}
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
