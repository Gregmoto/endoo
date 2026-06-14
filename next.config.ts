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

  // Consolidate www → apex so search engines index a single canonical host
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.endoo.se" }],
        destination: "https://endoo.se/:path*",
        permanent: true,
      },
    ]
  },

  // @react-pdf/renderer uses Node.js canvas internals — must NOT be bundled by webpack
  serverExternalPackages: ["@react-pdf/renderer"],

  // Bundle only what we use from heavy packages (client-side)
  experimental: {
    optimizePackageImports: [],
  },
}

export default config
