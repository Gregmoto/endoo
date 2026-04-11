import { cn } from "@/lib/utils"

export type BadgeVariant = "default" | "secondary" | "danger" | "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "orange"

const variantStyles: Record<BadgeVariant, string> = {
  default:   "bg-indigo-100 text-indigo-700",
  secondary: "bg-gray-100 text-gray-700",
  danger:    "bg-red-100 text-red-700",
  gray:      "bg-gray-100 text-gray-700",
  blue:      "bg-blue-100 text-blue-700",
  green:     "bg-green-100 text-green-700",
  yellow:    "bg-yellow-100 text-yellow-800",
  red:       "bg-red-100 text-red-700",
  purple:    "bg-purple-100 text-purple-700",
  orange:    "bg-orange-100 text-orange-700",
}

export function Badge({ children, variant = "secondary", className }: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}

// Invoice status → badge variant
export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft:         { label: "Utkast",    variant: "gray"   },
    sent:          { label: "Skickad",   variant: "blue"   },
    viewed:        { label: "Öppnad",    variant: "purple" },
    partial:       { label: "Delbetald", variant: "orange" },
    paid:          { label: "Betald",    variant: "green"  },
    overdue:       { label: "Förfallen", variant: "red"    },
    void:          { label: "Makulerad", variant: "gray"   },
    uncollectable: { label: "Osäker",    variant: "red"    },
  }
  const { label, variant } = map[status] ?? { label: status, variant: "gray" as BadgeVariant }
  return <Badge variant={variant}>{label}</Badge>
}
