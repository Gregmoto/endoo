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

export type ApprovalRequestEmailProps = BrandingProps & {
  approverName: string
  entityType: string
  entityRef: string
  requestedBy: string
  reviewUrl: string
}

export function ApprovalRequestEmail({
  orgName,
  logoUrl,
  primaryColor,
  approverName,
  entityType,
  entityRef,
  requestedBy,
  reviewUrl,
}: ApprovalRequestEmailProps) {
  const color = primaryColor ?? PRIMARY
  const previewText = `Godkännande krävs: ${entityType} ${entityRef} från ${requestedBy}`

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
              Godkännande krävs
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {approverName},
              <br />
              <br />
              <strong>{requestedBy}</strong> har skickat in ett{" "}
              <strong>{entityType.toLowerCase()}</strong> som kräver ditt
              godkännande.
            </Text>

            <Section
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 28,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        paddingBottom: 8,
                        paddingRight: 16,
                        whiteSpace: "nowrap",
                      }}
                    >
                      TYP
                    </td>
                    <td
                      style={{
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 600,
                        paddingBottom: 8,
                      }}
                    >
                      {entityType}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        paddingBottom: 8,
                        paddingRight: 16,
                        whiteSpace: "nowrap",
                      }}
                    >
                      REFERENS
                    </td>
                    <td
                      style={{
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 600,
                        paddingBottom: 8,
                      }}
                    >
                      {entityRef}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        paddingRight: 16,
                        whiteSpace: "nowrap",
                      }}
                    >
                      BEGÄRT AV
                    </td>
                    <td
                      style={{
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {requestedBy}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={{ textAlign: "center" }}>
              <Link
                href={reviewUrl}
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
                Granska &amp; godkänn
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
              Skickat via Endoo · {orgName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ApprovalRequestEmail
