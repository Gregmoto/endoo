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

export type ContractSignatureRequestEmailProps = BrandingProps & {
  contactName: string
  contractTitle: string
  signUrl: string
  expiresAt?: string
}

export function ContractSignatureRequestEmail({
  orgName,
  logoUrl,
  primaryColor,
  contactName,
  contractTitle,
  signUrl,
  expiresAt,
}: ContractSignatureRequestEmailProps) {
  const color = primaryColor ?? PRIMARY
  const previewText = `${orgName} ber dig signera: ${contractTitle}`

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
              Din signatur krävs
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {contactName},
              <br />
              <br />
              <strong>{orgName}</strong> har skickat ett avtal för din
              elektroniska signatur.
            </Text>

            <Section
              style={{
                backgroundColor: "#f5f3ff",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 24,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <Text
                style={{ color: "#4c1d95", fontSize: 12, margin: "0 0 4px" }}
              >
                AVTAL
              </Text>
              <Text
                style={{
                  color: "#1e1b4b",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {contractTitle}
              </Text>
              {expiresAt && (
                <Text
                  style={{ color: "#6d28d9", fontSize: 13, margin: "6px 0 0" }}
                >
                  Signera senast {expiresAt}
                </Text>
              )}
            </Section>

            <Text style={{ color: "#374151", fontSize: 14, margin: "0 0 24px" }}>
              Klicka på knappen nedan för att granska och signera avtalet
              digitalt. Din signatur är juridiskt bindande.
            </Text>

            <Section style={{ textAlign: "center" }}>
              <Link
                href={signUrl}
                style={{
                  backgroundColor: color,
                  color: "#ffffff",
                  padding: "12px 28px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Granska &amp; signera avtal
              </Link>
            </Section>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                margin: "20px 0 0",
                textAlign: "center",
              }}
            >
              Fungerar inte knappen? Kopiera länken:{" "}
              <Link href={signUrl} style={{ color: color }}>
                {signUrl}
              </Link>
            </Text>
          </Section>

          {/* Footer */}
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

export default ContractSignatureRequestEmail
