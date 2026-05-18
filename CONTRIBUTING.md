# Contributing to Endoo

## Money handling rules

All monetary amounts are stored as `BigInt` in öre (smallest currency unit, 1/100 of SEK/EUR etc.).

### Why BigInt?

JavaScript `Number` loses precision for integers above `2^53 − 1` (≈ 90 trillion öre ≈ 900 billion SEK). BigInt avoids this. An invoice for 100 SEK is stored as `10000n`.

### Serialization

**Never** call `JSON.stringify` directly on objects that contain BigInt money fields. It throws unless patched.

Use one of:

| Context | What to use |
|---------|-------------|
| API route response | `apiOk(data)` from `@/lib/api/response` |
| Cursor-paginated v1 response | `apiCursor(data, cursor, hasMore)` from `@/lib/api/response` |
| Manual serialization | `toJSON(value)` from `@/lib/serialize` |
| Rich money object | `serializeMoney(amount, currency)` from `@/lib/serialize` |

The global `BigInt.prototype.toJSON` patch in `src/instrumentation.ts` means `Response.json()` works safely at runtime, but using `apiOk()` is still preferred because it is explicit and testable.

### Wire format

On the wire (JSON responses, request bodies), money travels as **string** in öre:

```json
{ "totalAmount": "10050", "currency": "SEK" }
```

The `Money` type (`src/types/index.ts`) formalises this contract for external APIs.

### Parsing user input

To parse a money string from user input (e.g. `"100,50"` → `"10050"`):

```ts
import { parseMoneyInput } from "@/lib/format/money"
const öre = parseMoneyInput("100,50")  // "10050"
```

To parse a trusted API string back to BigInt:

```ts
import { parseMoney } from "@/lib/serialize"
const öre = parseMoney("10050")  // 10050n
```

### UI components

| Component | Use case |
|-----------|----------|
| `<MoneyInput>` | Editable money field — accepts comma/dot decimal, emits öre string |
| `<MoneyDisplay>` | Read-only formatted display |
| `formatMoney(öre, currency)` | Inline formatting in JSX |

### Lint convention

Add this comment above any object you are about to `JSON.stringify` that might contain money fields:

```ts
// MONEY-SAFE: uses apiOk() / toJSON() — BigInt serialized as string
```

If you see `Number(someAmount)` or `parseInt(someAmount)` on a money field from the database, flag it in review. The only safe conversion is for display purposes where precision loss is acceptable (≤ 90 trillion SEK).

### Summary of anti-patterns

```ts
// ❌ throws at runtime if BigInt is present
JSON.stringify(invoice)

// ❌ loses precision above 2^53 − 1 öre
Number(invoice.totalAmount)

// ❌ silently truncates BigInt
Response.json({ amount: 9007199254740993n })  // without the patch

// ✅ correct
apiOk({ amount: 9007199254740993n })

// ✅ correct (explicit)
toJSON({ amount: 9007199254740993n })  // → { amount: "9007199254740993" }
```

---

## API response conventions

All route handlers should use helpers from `@/lib/api/response`:

```ts
import { apiOk, apiError, apiPaginated, apiCursor } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(req: Request) {
  try {
    // ...
    return apiOk({ items })
  } catch (err) {
    return handleApiError(err, "my-route")
  }
}
```

Error codes: `unauthorized` (401), `payment_required` (402), `forbidden` (403), `not_found` (404), `bad_request` (400), `conflict` (409), `internal_error` (500).

---

## Commit conventions

```
feat:   new feature
fix:    bug fix
chore:  tooling, deps, version bumps
docs:   documentation only
test:   tests only
refactor: code change with no behavior change
```

Every commit touching `src/` must pass `npm run version:check`.
