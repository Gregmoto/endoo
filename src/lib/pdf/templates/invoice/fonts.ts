import path from "path"
import { Font } from "@react-pdf/renderer"

let registered = false

export function registerInvoiceFonts(): void {
  if (registered) return
  registered = true

  const f = (name: string) =>
    path.join(process.cwd(), "node_modules/@fontsource/inter/files", name)

  Font.register({
    family: "Inter",
    fonts: [
      { src: f("inter-latin-400-normal.woff2"), fontWeight: 400 },
      { src: f("inter-latin-500-normal.woff2"), fontWeight: 500 },
      { src: f("inter-latin-600-normal.woff2"), fontWeight: 600 },
      { src: f("inter-latin-700-normal.woff2"), fontWeight: 700 },
    ],
  })

  // Disable automatic hyphenation — keeps article codes and numbers intact
  Font.registerHyphenationCallback((word) => [word])
}
