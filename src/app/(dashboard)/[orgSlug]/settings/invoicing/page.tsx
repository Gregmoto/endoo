import { redirect } from "next/navigation"

export default async function InvoicingSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  redirect(`/${orgSlug}/settings/invoicing/general`)
}
