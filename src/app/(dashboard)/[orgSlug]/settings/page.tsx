export default function SettingsPage({ params }: { params: { orgSlug: string } }) {
  return <div>Inställningar — {params.orgSlug}</div>
}
