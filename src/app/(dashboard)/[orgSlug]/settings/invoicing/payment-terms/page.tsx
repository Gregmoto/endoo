import { LookupTable } from "../_components/LookupTable"

export default function PaymentTermsPage() {
  return (
    <LookupTable
      title="Betalningsvillkor"
      apiPath="/api/settings/payment-terms"
      columns={[
        { key: "code", label: "Kod" },
        { key: "name", label: "Namn" },
        { key: "days", label: "Dagar", type: "number" },
      ]}
      emptyForm={{ code: "", name: "", days: 30, isActive: true, isDefault: false, sortOrder: 0 }}
    />
  )
}
