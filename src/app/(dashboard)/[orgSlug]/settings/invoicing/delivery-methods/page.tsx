import { LookupTable } from "../_components/LookupTable"

export default function DeliveryMethodsPage() {
  return (
    <LookupTable
      title="Leveranssätt"
      apiPath="/api/settings/delivery-methods"
      columns={[
        { key: "code", label: "Kod" },
        { key: "name", label: "Namn" },
      ]}
      emptyForm={{ code: "", name: "", isActive: true, isDefault: false, sortOrder: 0 }}
    />
  )
}
