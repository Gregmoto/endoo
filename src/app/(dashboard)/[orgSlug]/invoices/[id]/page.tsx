export default function InvoicePage({ params }: { params: { orgSlug: string; id: string } }) {
  return <div>Faktura {params.id}</div>
}
