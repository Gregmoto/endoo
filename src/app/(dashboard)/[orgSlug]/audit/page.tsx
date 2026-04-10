export default function AuditPage({ params }: { params: { orgSlug: string } }) {
  return <div>Audit log — {params.orgSlug}</div>
}
