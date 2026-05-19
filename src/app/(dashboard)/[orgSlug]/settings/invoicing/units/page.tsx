import { LookupTable } from "../_components/LookupTable"

export default function UnitsPage() {
  return (
    <LookupTable
      title="Enheter"
      apiPath="/api/settings/units"
      columns={[
        { key: "code", label: "Kod" },
        { key: "name", label: "Namn" },
      ]}
      emptyForm={{ code: "", name: "", isActive: true, isDefault: false, sortOrder: 0 }}
      showSeedBtn
    />
  )
}
