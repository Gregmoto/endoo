/**
 * VIES EU VAT validation client.
 * Uses the EU VIES SOAP service via a simple fetch wrapper.
 * Results are cached in-process for 24 h to reduce rate-limit risk.
 */

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService"

interface ViesResult {
  valid:     boolean
  name?:     string
  address?:  string
  error?:    string
}

const cache = new Map<string, { result: ViesResult; expiresAt: number }>()
const TTL_MS = 24 * 60 * 60 * 1000

export async function validateVatNumber(
  vatNumber: string,
  country:   string,
): Promise<ViesResult> {
  const key = `${country}:${vatNumber}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.result

  // Strip country prefix if provided
  const number = vatNumber.replace(new RegExp(`^${country}`, "i"), "").trim()

  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${country}</urn:countryCode>
      <urn:vatNumber>${number}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`

  try {
    const res = await fetch(VIES_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
      body,
      signal:  AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { valid: false, error: "could_not_verify" }
    }

    const xml = await res.text()

    const valid   = /<valid>true<\/valid>/i.test(xml)
    const nameM   = xml.match(/<name>([\s\S]*?)<\/name>/)
    const addrM   = xml.match(/<address>([\s\S]*?)<\/address>/)

    const result: ViesResult = {
      valid,
      name:    nameM?.[1]?.trim() || undefined,
      address: addrM?.[1]?.trim() || undefined,
    }

    cache.set(key, { result, expiresAt: Date.now() + TTL_MS })
    return result
  } catch {
    return { valid: false, error: "could_not_verify" }
  }
}
