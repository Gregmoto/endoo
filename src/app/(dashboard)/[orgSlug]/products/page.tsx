export default function ProductsPage({ params }: { params: { orgSlug: string } }) {
  return <div>Produkter — {params.orgSlug}</div>
}
