export default function ContactsPage({ params }: { params: { orgSlug: string } }) {
  return <div>Kontakter — {params.orgSlug}</div>
}
