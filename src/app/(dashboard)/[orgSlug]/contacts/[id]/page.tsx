export default function ContactPage({ params }: { params: { orgSlug: string; id: string } }) {
  return <div>Kontakt {params.id}</div>
}
