import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://endoo.se"
  const now  = new Date()

  return [
    { url: base,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/konsulter`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/smaforetag`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/e-handel`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,      lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/cookies`,    lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${base}/login`,      lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/register`,   lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
  ]
}
