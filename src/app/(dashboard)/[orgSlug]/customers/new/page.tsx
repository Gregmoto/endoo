"use client"

import { useParams } from "next/navigation"
import { CustomerForm } from "@/components/customers/CustomerForm"

export default function NewCustomerPage() {
  const params = useParams<{ orgSlug: string }>()
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-4 border-b bg-card flex items-center gap-3">
        <a href={`/${params.orgSlug}/customers`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Kunder
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold text-foreground">Ny kund</h1>
      </div>
      <CustomerForm mode="new" orgSlug={params.orgSlug} />
    </div>
  )
}
