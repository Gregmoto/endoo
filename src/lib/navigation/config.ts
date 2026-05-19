export type NavCategory = {
  id: string
  label: string
  href: (orgSlug: string) => string
  matchPaths: string[]
  visibleWhen?: (orgType: string) => boolean
  subItems?: NavSubItem[]
}

export type NavSubItem = {
  id: string
  label: string
  href: (orgSlug: string) => string
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: (slug) => `/${slug}`,
    matchPaths: [],
  },
  {
    id: "accounting",
    label: "Bokföring",
    href: (slug) => `/${slug}/analytics`,
    matchPaths: [
      "/journals", "/accounts", "/reports", "/tax",
      "/analytics", "/year-end", "/accounting",
      "/fixed-assets", "/depreciation",
    ],
    subItems: [
      { id: "analytics", label: "Analys",     href: (s) => `/${s}/analytics` },
      { id: "journals",  label: "Verifikat",  href: (s) => `/${s}/journals`  },
      { id: "accounts",  label: "Kontoplan",  href: (s) => `/${s}/accounts`  },
      { id: "reports",   label: "Rapporter",  href: (s) => `/${s}/reports`   },
      { id: "vat",       label: "Moms",       href: (s) => `/${s}/tax/vat`   },
    ],
  },
  {
    id: "invoicing",
    label: "Fakturering",
    href: (slug) => `/${slug}/invoices/analytics`,
    matchPaths: ["/invoices", "/payments", "/reminders", "/recurring", "/contracts"],
    subItems: [
      { id: "invoicing-analytics", label: "Analys",        href: (s) => `/${s}/invoices/analytics` },
      { id: "invoices",            label: "Kundfakturor",  href: (s) => `/${s}/invoices`           },
      { id: "payments",            label: "Inbetalningar", href: (s) => `/${s}/payments`           },
      { id: "reminders",           label: "Påminnelser",   href: (s) => `/${s}/reminders`          },
      { id: "recurring",           label: "Avtal",         href: (s) => `/${s}/recurring`          },
    ],
  },
  {
    id: "inventory",
    label: "Lager",
    href: (slug) => `/${slug}/inventory`,
    matchPaths: ["/inventory"],
  },
  {
    id: "quotes",
    label: "Offerter",
    href: (slug) => `/${slug}/quotes`,
    matchPaths: ["/quotes"],
  },
  {
    id: "supplier-invoices",
    label: "Lev.fakturor",
    href: (slug) => `/${slug}/supplier-invoices`,
    matchPaths: ["/supplier-invoices"],
  },
  {
    id: "signatures",
    label: "Signeringar",
    href: (slug) => `/${slug}/signatures`,
    matchPaths: ["/signatures"],
  },
  {
    id: "calendar",
    label: "Kalender",
    href: (slug) => `/${slug}/calendar`,
    matchPaths: ["/calendar"],
  },
  {
    id: "agency",
    label: "Byrå",
    href: (slug) => `/${slug}/clients`,
    matchPaths: ["/clients", "/alerts"],
    visibleWhen: (orgType) => orgType === "agency",
    subItems: [
      { id: "clients",   label: "Klientkonton", href: (s) => `/${s}/clients`           },
      { id: "inbox",     label: "Inkorg",       href: (s) => `/${s}/clients/inbox`     },
      { id: "deadlines", label: "Deadlines",    href: (s) => `/${s}/clients/deadlines` },
      { id: "alerts",    label: "Varningar",    href: (s) => `/${s}/alerts`            },
    ],
  },
  {
    id: "register",
    label: "Register",
    href: (slug) => `/${slug}/customers`,
    matchPaths: ["/customers", "/contacts", "/articles", "/products"],
    subItems: [
      { id: "customers", label: "Kunder",   href: (s) => `/${s}/customers` },
      { id: "articles",  label: "Artiklar", href: (s) => `/${s}/articles`  },
    ],
  },
]
