import crypto from "crypto"

/** Generate a cryptographically random URL-safe token (raw) and its SHA-256 hash. */
export function generateSignerToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("base64url")
  const tokenHash = hashToken(rawToken)
  return { rawToken, tokenHash }
}

/** SHA-256 of a raw token — this is what we store in the DB. */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}

/** Build the public signing URL for a signer. */
export function signingUrl(rawToken: string): string {
  const base = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
  return `${base}/sign/${rawToken}`
}
