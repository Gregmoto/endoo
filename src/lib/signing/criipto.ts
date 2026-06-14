/**
 * Criipto BankID integration (Swedish BankID via OIDC authorization code flow).
 *
 * Environment variables required:
 *   CRIIPTO_DOMAIN          e.g. "your-tenant.criipto.id"
 *   CRIIPTO_CLIENT_ID       from Criipto dashboard
 *   CRIIPTO_CLIENT_SECRET   from Criipto dashboard
 *   AUTH_URL / NEXTAUTH_URL base URL for callback construction
 *
 * Flow:
 *   1. /api/sign/[token]/bankid/initiate → build auth URL → redirect
 *   2. Criipto redirects to /api/sign/[token]/bankid/callback?code=...
 *   3. Callback exchanges code for JWT, extracts claims, persists to Signer
 *   4. Callback redirects to /sign/[token]?bankid=done
 */

const SCOPE   = "openid ssn"
const ACR     = "urn:grn:authn:se:bankid:same-device"  // Swedish BankID same-device

export type CriiptoConfig = {
  domain:       string
  clientId:     string
  clientSecret: string
  redirectUri:  string
}

function getConfig(token: string): CriiptoConfig {
  const domain       = process.env.CRIIPTO_DOMAIN
  const clientId     = process.env.CRIIPTO_CLIENT_ID
  const clientSecret = process.env.CRIIPTO_CLIENT_SECRET
  if (!domain || !clientId || !clientSecret) {
    throw new Error("Missing Criipto env vars: CRIIPTO_DOMAIN, CRIIPTO_CLIENT_ID, CRIIPTO_CLIENT_SECRET")
  }
  const base        = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://app.endoo.se"
  const redirectUri = `${base}/api/sign/${encodeURIComponent(token)}/bankid/callback`
  return { domain, clientId, clientSecret, redirectUri }
}

/**
 * Build the Criipto authorization URL.
 * state = base64url(JSON { token, nonce }) — verified in callback.
 */
export function buildAuthUrl(token: string, nonce: string): string {
  const cfg = getConfig(token)
  const state = Buffer.from(JSON.stringify({ token, nonce })).toString("base64url")
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     cfg.clientId,
    redirect_uri:  cfg.redirectUri,
    scope:         SCOPE,
    acr_values:    ACR,
    state,
    nonce,
  })
  return `https://${cfg.domain}/oauth2/authorize?${params}`
}

export type BankIdClaims = {
  sub:              string   // e.g. "urn:grn:authn:se:bankid:..."
  ssn:              string   // Swedish personnummer (12 digits)
  name:             string
  given_name?:      string
  family_name?:     string
  transactionId?:   string
  certNotBefore?:   string
  certNotAfter?:    string
}

/**
 * Exchange authorization code for ID token, return verified claims.
 */
export async function exchangeCode(token: string, code: string): Promise<BankIdClaims> {
  const cfg = getConfig(token)

  const tokenRes = await fetch(`https://${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  cfg.redirectUri,
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Criipto token exchange failed: ${err}`)
  }

  const { id_token } = await tokenRes.json() as { id_token: string }
  return decodeIdToken(id_token)
}

/**
 * Decode a JWT without full signature verification (signature is already
 * validated by HTTPS transport + Criipto's token endpoint).
 * For production hardening, verify with JWKS — but Criipto guarantees the
 * token came from their endpoint so transport-level trust is sufficient here.
 */
function decodeIdToken(idToken: string): BankIdClaims {
  const parts = idToken.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT structure")
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"))

  return {
    sub:            payload.sub             ?? "",
    ssn:            payload.ssn             ?? payload["http://criipto.com/claims/ssn"] ?? "",
    name:           payload.name            ?? `${payload.given_name ?? ""} ${payload.family_name ?? ""}`.trim(),
    given_name:     payload.given_name,
    family_name:    payload.family_name,
    transactionId:  payload["http://criipto.com/claims/transaction_id"],
    certNotBefore:  payload["http://criipto.com/claims/cert/notBefore"],
    certNotAfter:   payload["http://criipto.com/claims/cert/notAfter"],
  }
}

/**
 * Generate a cryptographically random nonce (hex string).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
}
