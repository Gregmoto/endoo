"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CustomerForm, type CustomerFormData } from "@/components/customers/CustomerForm"

export default function CustomerEditPage() {
  const params = useParams<{ orgSlug: string; id: string }>()
  const { orgSlug, id } = params

  const [initialData, setInitialData] = useState<Partial<CustomerFormData> | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setInitialData(mapToFormData(data))
        setLoading(false)
      })
  }, [id])

  if (loading)  return <div className="p-8 text-sm text-muted-foreground">Laddar…</div>
  if (notFound) return <div className="p-8 text-sm text-destructive">Kunden hittades inte.</div>

  return (
    <CustomerForm
      mode="edit"
      orgSlug={orgSlug}
      customerId={id}
      initialData={initialData ?? undefined}
    />
  )
}

function mapToFormData(c: Record<string, unknown>): Partial<CustomerFormData> {
  return {
    customerNumber:     String(c.customerNumber  ?? ""),
    customerType:       (c.customerType as "business" | "individual") ?? "business",
    orgNumber:          String(c.orgNumber        ?? ""),
    personalNumber:     String(c.personalNumber   ?? ""),
    isArchived:         Boolean(c.isArchived),
    name:               String(c.name             ?? ""),
    addressLine1:       String(c.addressLine1      ?? ""),
    addressLine2:       String(c.addressLine2      ?? ""),
    postalCode:         String(c.postalCode        ?? ""),
    city:               String(c.city              ?? ""),
    country:            String(c.country           ?? "SE"),
    countryCode:        String(c.countryCode       ?? ""),
    phone:              String(c.phone             ?? ""),
    phone2:             String(c.phone2            ?? ""),
    fax:                String(c.fax               ?? ""),
    email:              String(c.email             ?? ""),
    website:            String(c.website           ?? ""),
    deliveryLine1:      String(c.deliveryLine1     ?? ""),
    deliveryLine2:      String(c.deliveryLine2     ?? ""),
    deliveryPostalCode: String(c.deliveryPostalCode ?? ""),
    deliveryCity:       String(c.deliveryCity      ?? ""),
    deliveryCountry:    String(c.deliveryCountry   ?? ""),
    visitingLine1:      String(c.visitingLine1     ?? ""),
    visitingLine2:      String(c.visitingLine2     ?? ""),
    visitingPostalCode: String(c.visitingPostalCode ?? ""),
    visitingCity:       String(c.visitingCity      ?? ""),
    visitingCountry:    String(c.visitingCountry   ?? ""),
    internalNotes:      String(c.internalNotes     ?? ""),
    defaultPaymentTermsDays: c.defaultPaymentTermsDays != null ? String(c.defaultPaymentTermsDays) : "",
    deliveryTermsId:    String(c.deliveryTermsId   ?? ""),
    deliveryMethodId:   String(c.deliveryMethodId  ?? ""),
    interestInvoicing:  Boolean(c.interestInvoicing),
    priceListId:        String(c.priceListId       ?? ""),
    defaultCurrency:    String(c.defaultCurrency   ?? ""),
    invoiceDiscountRate: c.invoiceDiscountRate != null
      ? String((parseFloat(String(c.invoiceDiscountRate)) * 100).toFixed(2))
      : "",
    invoiceFeeAmount:   c.invoiceFeeAmount != null ? String(Number(c.invoiceFeeAmount) / 100) : "",
    freightAmount:      c.freightAmount   != null ? String(Number(c.freightAmount)    / 100) : "",
    pricesIncludeVat:   Boolean(c.pricesIncludeVat),
    ourReference:       String(c.ourReference      ?? ""),
    accountManagerId:   String(c.accountManagerId  ?? ""),
    externalReference:  String(c.externalReference ?? ""),
    yourReferenceLabel: String(c.yourReferenceLabel ?? ""),
    customerReference:  String(c.customerReference ?? ""),
    vatNumber:          String(c.vatNumber          ?? ""),
    defaultVatType:     String(c.defaultVatType     ?? ""),
    salesAccountOverride: String(c.salesAccountOverride ?? ""),
    invoiceEmails:      c.invoiceEmails
      ? String(c.invoiceEmails).split(",").map((e: string) => e.trim()).filter(Boolean)
      : [],
    invoiceFreeText:    String(c.invoiceFreeText   ?? ""),
  }
}
