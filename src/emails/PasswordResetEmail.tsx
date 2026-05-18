import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

const PRIMARY = "#4f46e5"
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'

export type PasswordResetEmailProps = {
  userName?: string
  resetUrl: string
  expiresMinutes: number
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiresMinutes,
}: PasswordResetEmailProps) {
  const previewText = "Återställ ditt Endoo-lösenord"

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
          <Section style={{ backgroundColor: PRIMARY, padding: "28px 40px" }}>
            <Text
              style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}
            >
              Endoo
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "36px 40px" }}>
            <Heading
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 16px",
              }}
            >
              Återställ lösenord
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              {userName ? `Hej ${userName},` : "Hej,"}
              <br />
              <br />
              Vi har mottagit en begäran om att återställa lösenordet för ditt
              Endoo-konto. Klicka på knappen nedan för att välja ett nytt
              lösenord.
            </Text>

            <Section style={{ textAlign: "center", marginBottom: 24 }}>
              <Link
                href={resetUrl}
                style={{
                  backgroundColor: PRIMARY,
                  color: "#ffffff",
                  padding: "14px 36px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Återställ lösenord
              </Link>
            </Section>

            <Section
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 20,
                borderLeft: "4px solid #f59e0b",
              }}
            >
              <Text
                style={{ color: "#92400e", fontSize: 13, margin: 0, textAlign: "center" }}
              >
                Länken är giltig i <strong>{expiresMinutes} minuter</strong> och
                kan bara användas en gång.
              </Text>
            </Section>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 13,
                margin: "0 0 8px",
                textAlign: "center",
              }}
            >
              Begärde du inte att återställa ditt lösenord? Ignorera detta
              meddelande — ditt konto förblir oförändrat.
            </Text>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                margin: 0,
                textAlign: "center",
              }}
            >
              Fungerar inte knappen?{" "}
              <Link href={resetUrl} style={{ color: PRIMARY }}>
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
              © {new Date().getFullYear()} Endoo · Alla rättigheter förbehållna
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail
