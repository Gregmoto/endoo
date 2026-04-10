import { auth } from "@/lib/auth"

export default async function DashboardPage({ params }: { params: { orgSlug: string } }) {
  const session = await auth()
  return (
    <div>
      <h1>Dashboard — {params.orgSlug}</h1>
      <p>Inloggad som {session?.user?.email}</p>
    </div>
  )
}
