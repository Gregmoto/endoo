import { LookupTable } from "../_components/LookupTable"

export default function DeliveryTermsPage() {
  return (
    <LookupTable
      title="Leveransvillkor (Incoterms)"
      apiPath="/api/settings/delivery-terms"
      columns={[
        { key: "code", label: "Kod" },
        { key: "name", label: "Namn" },
      ]}
      emptyForm={{ code: "", name: "", isActive: true, isDefault: false, sortOrder: 0 }}
    />
  )
}
