/**
 * Company lookup provider pattern.
 * Currently only a placeholder — providers can be added per plan.
 */

export interface CompanyInfo {
  name:         string
  orgNumber:    string
  addressLine1?: string
  postalCode?:   string
  city?:         string
  vatNumber?:    string
  phone?:        string
  email?:        string
}

export interface LookupResult {
  found:    boolean
  data?:    CompanyInfo
  error?:   string
  provider: string
}

export type LookupProvider = (orgNumber: string) => Promise<LookupResult>

// Registry of providers — register in application setup
const providers: LookupProvider[] = []

export function registerProvider(provider: LookupProvider) {
  providers.push(provider)
}

export async function lookupCompany(orgNumber: string): Promise<LookupResult> {
  if (providers.length === 0) {
    return { found: false, error: "no_provider", provider: "none" }
  }
  // Try providers in registration order
  for (const provider of providers) {
    try {
      const result = await provider(orgNumber)
      if (result.found) return result
    } catch {
      // try next
    }
  }
  return { found: false, error: "not_found", provider: "none" }
}
