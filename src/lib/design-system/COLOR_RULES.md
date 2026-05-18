# Endoo — Färgregler för utvecklare

Alla UI-komponenter MÅSTE använda semantiska Tailwind-klasser.
**Aldrig** hårdkodade Tailwind-gråskalor eller hex-färger i komponentkod.

---

## Förbjudna klasser

```
text-gray-*   text-zinc-*   text-slate-*   text-neutral-*
bg-gray-*     bg-zinc-*     bg-slate-*     bg-white
border-gray-* border-zinc-* border-slate-*
text-black    text-white    (använd semantiska istället)
#xxxxxx       rgb()         hsl()          (hårdkod bara i globals.css)
```

Kör `npm run audit:colors` — blockerande pre-commit-hook vid errors.

---

## Semantiska klasser — använd alltid dessa

### Text

| Klass                    | Användning                              |
|--------------------------|------------------------------------------|
| `text-foreground`        | Primär, läsbar text                      |
| `text-muted-foreground`  | Sekundär/hjälptext, labels               |
| `text-primary`           | Accentfärg / brand-länkfärg             |
| `text-primary-foreground`| Text på primär (brand) bakgrund         |
| `text-destructive`       | Felmeddelanden                           |
| `text-success`           | Positiva meddelanden                     |
| `text-warning-foreground`| Varningstext                             |
| `text-info`              | Informationstext                         |

### Bakgrund

| Klass            | Användning                            |
|------------------|----------------------------------------|
| `bg-background`  | Sidans bakgrund                        |
| `bg-card`        | Kort, paneler, dropdowns               |
| `bg-popover`     | Tooltips, popovers                     |
| `bg-muted`       | Subtil bakgrund (tabellband, inputs)  |
| `bg-accent`      | Hover-bakgrund på interaktiva element  |
| `bg-sidebar`     | Sidomenyn                              |
| `bg-primary`     | Brand-knappar och highlights           |
| `bg-destructive` | Felknappar                             |
| `bg-success`     | Framgångsbakgrund                      |

### Border

| Klass              | Användning                      |
|--------------------|---------------------------------|
| `border`           | Standard border (`border-border`) |
| `border-input`     | Input-fält border               |
| `border-destructive` | Fel-border på inputs           |
| `border-sidebar-border` | Sidebar-specifik border     |

### Hover / fokus

```
hover:bg-accent hover:text-accent-foreground   ← interaktiva listobjekt
hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  ← sidebar-items
focus-visible:outline-ring                     ← focus-ring (inbyggd i Button)
```

---

## Specialfall

```tsx
// Tabellradband
<tr className="even:bg-muted/50">

// Disabled
className="opacity-50 cursor-not-allowed"

// Status-badges — använd alltid StatusBadge-komponenten
import { StatusBadge } from "@/components/ui/StatusBadge"
<StatusBadge status="paid" />

// PDF-templates — hårdkodade färger är OK (mörkt läge stöds ej av react-pdf)
import { PDF_COLORS } from "@/lib/pdf/colors"

// Email-templates — inline CSS + media queries (se src/emails/)
```

---

## Kontrastmål (WCAG AA)

- Normal text: ≥ 4.5:1
- Stor text (≥ 18pt / 14pt bold): ≥ 3:1
- UI-komponenter / grafik: ≥ 3:1

Variabler är kalibrerade för AA i båda lägen:
- `--foreground` mot `--background` → ~14:1 (AAA)
- `--muted-foreground` mot `--background` → ~5:1 (AA)
- `--primary` mot `--primary-foreground` → ~6:1 (AA)
