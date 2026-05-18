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

export type InvitationEmailProps = {
  inviterName: string
  orgName: string
  role: string
  acceptUrl: string
  expiresAt?: string
}

export function InvitationEmail({
  inviterName,
  orgName,
  role,
  acceptUrl,
  expiresAt,
}: InvitationEmailProps) {
  const previewText = `${inviterName} bjuder in dig till ${orgName} på Endoo`

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
              Du har blivit inbjuden
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              <strong>{inviterName}</strong> bjuder in dig att gå med i{" "}
              <strong>{orgName}</strong> på Endoo som{" "}
              <strong>{role}</strong>.
            </Text>

            <Section
              style={{
                backgroundColor: "#f5f3ff",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 28,
                borderLeft: `4px solid ${PRIMARY}`,
              }}
            >
              <Text style={{ color: "#4c1d95", fontSize: 13, margin: "0 0 4px" }}>
                ORGANISATION
              </Text>
              <Text
                style={{
                  color: "#1e1b4b",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {orgName}
              </Text>
              <Text style={{ color: "#6d28d9", fontSize: 13, margin: "4px 0 0" }}>
                Roll: {role}
              </Text>
              {expiresAt && (
                <Text
                  style={{ color: "#7c3aed", fontSize: 12, margin: "4px 0 0" }}
                >
                  Inbjudan gäller till {expiresAt}
                </Text>
              )}
            </Section>

            <Section style={{ textAlign: "center", marginBottom: 20 }}>
              <Link
                href={acceptUrl}
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
                Acceptera inbjudan
              </Link>
            </Section>

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                margin: 0,
                textAlign: "center",
              }}
            >
              Om du inte känner igen denna inbjudan kan du ignorera detta
              meddelande.
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
              © {new Date().getFullYear()} Endoo · Alla rättigheter förbehållna
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default InvitationEmail
