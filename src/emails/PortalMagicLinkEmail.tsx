import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import type { BrandingProps } from "./types"

const PRIMARY = "#4f46e5"
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'

export type PortalMagicLinkEmailProps = BrandingProps & {
  contactName: string
  magicLinkUrl: string
  expiresMinutes: number
}

export function PortalMagicLinkEmail({
  orgName,
  logoUrl,
  primaryColor,
  contactName,
  magicLinkUrl,
  expiresMinutes,
}: PortalMagicLinkEmailProps) {
  const color = primaryColor ?? PRIMARY
  const previewText = `Din inloggningslänk till ${orgName}s kundportal`

  return (
    <Html lang="sv">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: FONT, margin: 0 }}>
        <Container
          style={{
            maxWidth: 600,
            margin: "40px auto",
            backgroundColor: "#ffffff",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Section style={{ backgroundColor: color, padding: "28px 40px" }}>
            {logoUrl && (
              <Img
                src={logoUrl}
                height={36}
                alt={orgName}
                style={{ marginBottom: 8 }}
              />
            )}
            <Text
              style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}
            >
              {orgName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px" }}>
            <Heading
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 16px",
              }}
            >
              Din inloggningslänk
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {contactName},
              <br />
              <br />
              Du har begärt åtkomst till {orgName}s kundportal. Klicka på
              knappen nedan för att logga in — ingen lösenord krävs.
            </Text>

            <Section style={{ textAlign: "center", marginBottom: 24 }}>
              <Link
                href={magicLinkUrl}
                style={{
                  backgroundColor: color,
                  color: "#ffffff",
                  padding: "14px 32px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Logga in på kundportalen
              </Link>
            </Section>

            <Section
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#6b7280",
                  fontSize: 13,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Länken är giltig i{" "}
                <strong style={{ color: "#374151" }}>
                  {expiresMinutes} minuter
                </strong>
                {" "}och kan bara användas en gång.
              </Text>
            </Section>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                margin: "12px 0 0",
                textAlign: "center",
              }}
            >
              Begärde du inte den här länken? Ignorera detta e-postmeddelande.
            </Text>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                margin: "8px 0 0",
                textAlign: "center",
              }}
            >
              Fungerar inte knappen?{" "}
              <Link href={magicLinkUrl} style={{ color: color }}>
                Kopiera länken
              </Link>
            </Text>
          </Section>

          {/* Footer — no unsubscribe (transactional) */}
          <Hr style={{ borderColor: "#f0f0f0", margin: 0 }} />
          <Section style={{ padding: "16px 40px" }}>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 11,
                textAlign: "center",
                margin: 0,
              }}
            >
              Skickat via Endoo · {orgName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PortalMagicLinkEmail
