"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import ArticleForm from "@/components/articles/ArticleForm"

export default function NewArticlePage() {
  const params = useParams<{ orgSlug: string }>()
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-4 border-b bg-card flex items-center gap-3">
        <Link href={`/${params.orgSlug}/articles`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Artiklar
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold text-foreground">Ny artikel</h1>
      </div>
      <ArticleForm mode="new" orgSlug={params.orgSlug} />
    </div>
  )
}
