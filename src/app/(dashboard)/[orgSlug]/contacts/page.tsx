import { redirect } from "next/navigation"

// Redirect /contacts → /customers for backwards compatibility
export default async function ContactsRedirect({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[]>>
}) {
  const { orgSlug } = await params
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach(x => qs.append(k, x))
    else qs.set(k, v)
  }
  const query = qs.toString()
  redirect(`/${orgSlug}/customers${query ? `?${query}` : ""}`)
}
