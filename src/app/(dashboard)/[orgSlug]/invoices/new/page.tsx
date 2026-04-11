"use client"
import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Contact { id: string; name: string }
interface LineItem { description: string; quantity: number; unitPrice: number; taxRate: number }

export default function NewInvoicePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = use(params)
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [form, setForm] = useState({
    contactId: "", issueDate: new Date().toISOString().slice(0,10),
    dueDate: "", currency: "SEK",
  })
  const [lines, setLines] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0.25 }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/contacts").then(r => r.json()).then(d => setContacts(d.contacts ?? []))
    const due = new Date()
    due.setDate(due.getDate() + 30)
    setForm(f => ({ ...f, dueDate: due.toISOString().slice(0,10) }))
  }, [])

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function setLine(i: number, field: keyof LineItem, value: string | number) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() { setLines(ls => [...ls, { description: "", quantity: 1, unitPrice: 0, taxRate: 0.25 }]) }
  function removeLine(i: number) { setLines(ls => ls.filter((_, idx) => idx !== i)) }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const tax = lines.reduce((s, l) => s + l.quantity * l.unitPrice * l.taxRate, 0)
  const total = subtotal + tax

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lineItems: lines }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Fel"); setLoading(false); return }
    router.push(`/${orgSlug}/invoices/${data.id}`)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ny faktura</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Mottagare & datum</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Select label="Kund" value={form.contactId} onChange={set("contactId")}
              options={[{ value: "", label: "Välj kund…" }, ...contacts.map(c => ({ value: c.id, label: c.name }))]} />
            <Select label="Valuta" value={form.currency} onChange={set("currency")}
              options={[{ value: "SEK", label: "SEK" }, { value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }]} />
            <Input label="Fakturadatum" type="date" value={form.issueDate} onChange={set("issueDate")} required />
            <Input label="Förfallodatum" type="date" value={form.dueDate} onChange={set("dueDate")} required />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rader</CardTitle>
              <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:underline">+ Lägg till rad</button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Beskrivning","Antal","À-pris (kr)","Moms","Summa",""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="px-4 py-2">
                      <input value={line.description} onChange={e => setLine(i,"description",e.target.value)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent" placeholder="Tjänst/vara" required />
                    </td>
                    <td className="px-2 py-2 w-20">
                      <input type="number" min="0.01" step="any" value={line.quantity}
                        onChange={e => setLine(i,"quantity",parseFloat(e.target.value)||0)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right" />
                    </td>
                    <td className="px-2 py-2 w-28">
                      <input type="number" min="0" step="any" value={line.unitPrice}
                        onChange={e => setLine(i,"unitPrice",parseFloat(e.target.value)||0)}
                        className="w-full text-sm border-0 focus:ring-0 bg-transparent text-right" />
                    </td>
                    <td className="px-2 py-2 w-20">
                      <select value={line.taxRate} onChange={e => setLine(i,"taxRate",parseFloat(e.target.value))}
                        className="w-full text-sm border-0 bg-transparent">
                        <option value={0.25}>25%</option>
                        <option value={0.12}>12%</option>
                        <option value={0.06}>6%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums w-28">
                      {(line.quantity * line.unitPrice * (1 + line.taxRate)).toLocaleString("sv-SE",{minimumFractionDigits:2})}
                    </td>
                    <td className="px-2 py-2">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-sm space-y-1 text-right">
              <div className="text-gray-500">Netto: {subtotal.toLocaleString("sv-SE",{minimumFractionDigits:2})} {form.currency}</div>
              <div className="text-gray-500">Moms: {tax.toLocaleString("sv-SE",{minimumFractionDigits:2})} {form.currency}</div>
              <div className="font-bold text-gray-900 text-base">Totalt: {total.toLocaleString("sv-SE",{minimumFractionDigits:2})} {form.currency}</div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={loading} size="lg">Spara faktura</Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>Avbryt</Button>
        </div>
      </form>
    </div>
  )
}
