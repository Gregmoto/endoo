/**
 * AES-256-GCM encryption for connector credentials.
 *
 * Each Connection gets its own 12-byte IV stored in Connection.encryptionIv.
 * The master key comes from INTEGRATION_ENCRYPTION_KEY (32-byte hex).
 *
 * Encrypted values are stored as base64(iv + authTag + ciphertext).
 * IV is also stored separately in the DB for key-rotation scenarios.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES   = 12
const TAG_BYTES  = 16

function masterKey(): Buffer {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export function generateIv(): string {
  return randomBytes(IV_BYTES).toString("base64")
}

export function encrypt(plaintext: string, ivBase64: string): string {
  const key    = masterKey()
  const iv     = Buffer.from(ivBase64, "base64")
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag       = cipher.getAuthTag()

  // Store as base64(authTag + ciphertext) — IV lives in Connection.encryptionIv
  return Buffer.concat([tag, encrypted]).toString("base64")
}

export function decrypt(ciphertextBase64: string, ivBase64: string): string {
  const key  = masterKey()
  const iv   = Buffer.from(ivBase64, "base64")
  const buf  = Buffer.from(ciphertextBase64, "base64")

  const tag        = buf.subarray(0, TAG_BYTES)
  const ciphertext = buf.subarray(TAG_BYTES)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8")
}

/** Encrypt only if value is non-null. */
export function encryptNullable(value: string | null | undefined, ivBase64: string): string | null {
  if (value == null) return null
  return encrypt(value, ivBase64)
}

/** Decrypt only if value is non-null. */
export function decryptNullable(value: string | null | undefined, ivBase64: string): string | null {
  if (value == null) return null
  return decrypt(value, ivBase64)
}
