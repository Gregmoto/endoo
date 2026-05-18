/**
 * /platform/design-system
 * Internal design-system documentation page (super_admin only).
 * Shows all semantic color tokens, StatusBadge variants, and Button variants.
 */

import { requireSuperAdmin } from "@/lib/rbac/guards"
import { StatusBadge }       from "@/components/ui/StatusBadge"

export default async function DesignSystemPage() {
  await requireSuperAdmin()

  const colorTokens = [
    { name: "background",           cls: "bg-background",         text: "text-foreground" },
    { name: "foreground",           cls: "bg-foreground",         text: "text-background" },
    { name: "card",                 cls: "bg-card",               text: "text-card-foreground" },
    { name: "muted",                cls: "bg-muted",              text: "text-muted-foreground" },
    { name: "accent",               cls: "bg-accent",             text: "text-accent-foreground" },
    { name: "primary",              cls: "bg-primary",            text: "text-primary-foreground" },
    { name: "secondary",            cls: "bg-secondary",          text: "text-secondary-foreground" },
    { name: "destructive",          cls: "bg-destructive",        text: "text-destructive-foreground" },
    { name: "success",              cls: "bg-success",            text: "text-success-foreground" },
    { name: "warning",              cls: "bg-warning",            text: "text-warning-foreground" },
    { name: "info",                 cls: "bg-info",               text: "text-info-foreground" },
    { name: "border",               cls: "bg-border",             text: "text-foreground" },
    { name: "sidebar",              cls: "bg-sidebar",            text: "text-sidebar-foreground" },
    { name: "sidebar-accent",       cls: "bg-sidebar-accent",     text: "text-sidebar-accent-foreground" },
  ]

  const statuses = [
    "draft","sent","viewed","partial","paid","overdue","void",
    "needs_review","approved","booked","rejected","open","locked",
    "closed","active","inactive","pending","error","signed","failed","completed",
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Design System</h1>
        <p className="text-muted-foreground text-sm">Endoo · Intern referens · Super admin only</p>
      </div>

      {/* Color tokens */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Semantiska färgtoken</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {colorTokens.map(t => (
            <div key={t.name} className={`${t.cls} rounded-lg p-4 border border-border`}>
              <p className={`${t.text} text-sm font-semibold`}>{t.name}</p>
              <p className={`${t.text} text-xs opacity-70 mt-0.5`}>{t.cls}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Typografi</h2>
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <p className="text-foreground text-xl font-bold">text-foreground (xl bold)</p>
          <p className="text-foreground text-base">text-foreground (base)</p>
          <p className="text-muted-foreground text-sm">text-muted-foreground (sm) — hjälptext, labels</p>
          <p className="text-muted-foreground text-xs">text-muted-foreground (xs) — sekundär metadata</p>
          <p className="text-primary text-sm font-medium">text-primary — brand/action</p>
          <p className="text-destructive text-sm">text-destructive — fel</p>
          <p className="text-success text-sm">text-success — lyckat</p>
          <p className="text-warning-foreground text-sm">text-warning-foreground — varning</p>
          <p className="text-info text-sm">text-info — info</p>
        </div>
      </section>

      {/* StatusBadge */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">StatusBadge</h2>
        <div className="flex flex-wrap gap-2">
          {statuses.map(s => <StatusBadge key={s} status={s} />)}
        </div>
      </section>

      {/* Border */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Border tokens</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {["border","border-input","border-destructive","border-sidebar-border"].map(b => (
            <div key={b} className={`bg-card p-4 rounded-lg border ${b}`}>
              <code className="text-muted-foreground text-xs">{b}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
