/**
 * Next.js instrumentation hook — runs once on server startup (Node.js runtime).
 *
 * Patches BigInt.prototype.toJSON so that JSON.stringify handles BigInt values
 * throughout the entire app without requiring per-file workarounds.
 *
 * Result: BigInt values are serialized as strings to preserve full precision
 * (JS Number loses precision for values > 2^53 − 1).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(BigInt.prototype as any).toJSON = function () {
      return this.toString()
    }
  }
}
