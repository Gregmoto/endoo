import { redirect } from "next/navigation"

export default async function ImportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/settings/import/sie`)
}
