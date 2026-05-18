import type { NextConfig } from "next"

const config: NextConfig = {
  // Strict mode catches side-effect bugs early
  reactStrictMode: true,

  // Security headers on every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },

  // Redirect root → /app after auth is wired up
  async redirects() {
    return []
  },

  // @react-pdf/renderer uses Node.js canvas internals — must NOT be bundled by webpack
  serverExternalPackages: ["@react-pdf/renderer"],

  // Bundle only what we use from heavy packages (client-side)
  experimental: {
    optimizePackageImports: [],
  },
}

export default config
