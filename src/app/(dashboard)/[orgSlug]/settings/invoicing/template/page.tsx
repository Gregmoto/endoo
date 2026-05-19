"use client"

import { useParams } from "next/navigation"
import { TemplateEditor } from "@/components/settings/template/TemplateEditor"

export default function TemplatePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  return <TemplateEditor orgSlug={orgSlug} />
}
