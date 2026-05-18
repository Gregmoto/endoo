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

export type WelcomeEmailProps = {
  appName?: string
  userName: string
  loginUrl: string
}

export function WelcomeEmail({
  appName = "Endoo",
  userName,
  loginUrl,
}: WelcomeEmailProps) {
  const previewText = `Välkommen till ${appName}, ${userName}!`

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
              {appName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "36px 40px" }}>
            <Heading
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 8px",
              }}
            >
              Välkommen, {userName}!
            </Heading>
            <Text
              style={{ color: "#6b7280", fontSize: 16, margin: "0 0 28px" }}
            >
              Vi är glada att du är med oss.
            </Text>

            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Ditt konto är nu aktiverat. Du kan logga in och börja använda{" "}
              {appName} direkt.
            </Text>

            <Section
              style={{
                backgroundColor: "#f0f9ff",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 28,
              }}
            >
              <Text
                style={{ color: "#0369a1", fontSize: 14, margin: "0 0 8px", fontWeight: 600 }}
              >
                Kom igång snabbt:
              </Text>
              <Text style={{ color: "#374151", fontSize: 14, margin: "0 0 4px" }}>
                ✓ Skapa din organisation och lägg till kollegor
              </Text>
              <Text style={{ color: "#374151", fontSize: 14, margin: "0 0 4px" }}>
                ✓ Lägg till dina kunder och produkter
              </Text>
              <Text style={{ color: "#374151", fontSize: 14, margin: 0 }}>
                ✓ Skicka din första faktura
              </Text>
            </Section>

            <Section style={{ textAlign: "center" }}>
              <Link
                href={loginUrl}
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
                Logga in på {appName}
              </Link>
            </Section>
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
              © {new Date().getFullYear()} {appName} · Alla rättigheter förbehållna
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail
