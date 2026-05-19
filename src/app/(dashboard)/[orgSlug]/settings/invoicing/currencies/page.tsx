import { LookupTable } from "../_components/LookupTable"

export default function CurrenciesPage() {
  return (
    <LookupTable
      title="Valutor"
      apiPath="/api/settings/currencies"
      columns={[
        { key: "code",   label: "Kod (ISO 4217)" },
        { key: "symbol", label: "Symbol" },
      ]}
      emptyForm={{ code: "", symbol: "", isActive: true, isDefault: false }}
      showSeedBtn
    />
  )
}
