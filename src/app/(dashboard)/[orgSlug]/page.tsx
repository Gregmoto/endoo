import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard"
import { AgencyDashboardPlaceholder } from "@/components/dashboard/AgencyDashboardPlaceholder"

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, type: true },
  })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true },
  })

  const userName = user?.fullName ?? session.user.email?.split("@")[0] ?? "dig"

  if (org?.type === "agency") {
    return <AgencyDashboardPlaceholder />
  }

  return <CompanyDashboard orgSlug={orgSlug} userName={userName} />
}
