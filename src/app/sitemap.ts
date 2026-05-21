import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://endoo.se"
  const now  = new Date()

  return [
    { url: base,                                                    lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/konsulter`,                                     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/smaforetag`,                                    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/e-handel`,                                      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/byra`,                                          lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/funktioner`,                                    lastModified: now, changeFrequency: "monthly", priority: 0.8 },

    // Artiklar (kunskapsbas)
    { url: `${base}/artiklar`,                                      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/artiklar/ai-bokforing`,                         lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/avtalsfakturering`,                    lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/bokforing-smaforetag`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/digital-fakturering`,                  lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/ekonomisystem-byra`,                   lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-balansrapport`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-bas-kontoplan`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-ett-ekonomisystem`,             lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-huvudbok`,                      lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-resultatrapport`,               lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/artiklar/vad-ar-sie-fil`,                       lastModified: now, changeFrequency: "monthly", priority: 0.6 },

    { url: `${base}/privacy`,                                       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,                                         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/cookies`,                                       lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ]
}
