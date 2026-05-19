"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function ProductsRedirect() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/${params.orgSlug}/articles`)
  }, [params.orgSlug, router])

  return null
}
