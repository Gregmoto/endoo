export default function TeamPage({ params }: { params: { orgSlug: string } }) {
  return <div>Team — {params.orgSlug}</div>
}
