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

function fmtMoney(öre: number, currency: string) {
  return (
    (öre / 100).toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    currency
  )
}

export type InvoiceOverdueEmailProps = BrandingProps & {
  contactName: string
  invoiceNumber: string
  dueDate: string
  daysOverdue: number
  currency: string
  balanceAmount: number
  portalUrl?: string
}

export function InvoiceOverdueEmail({
  orgName,
  logoUrl,
  primaryColor,
  contactName,
  invoiceNumber,
  dueDate,
  daysOverdue,
  currency,
  balanceAmount,
  portalUrl,
}: InvoiceOverdueEmailProps) {
  const color = primaryColor ?? PRIMARY
  const previewText = `Faktura ${invoiceNumber} är ${daysOverdue} dagar förfallen`

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
          <Section style={{ backgroundColor: "#dc2626", padding: "28px 40px" }}>
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
              Förfallen faktura — åtgärd krävs
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {contactName},
              <br />
              <br />
              Faktura <strong>{invoiceNumber}</strong> förföll{" "}
              <strong>{dueDate}</strong> och är nu{" "}
              <strong style={{ color: "#dc2626" }}>
                {daysOverdue} {daysOverdue === 1 ? "dag" : "dagar"} förfallen
              </strong>
              . Vi ber dig att snarast reglera beloppet.
            </Text>

            <Section
              style={{
                backgroundColor: "#fef2f2",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 24,
                borderLeft: "4px solid #dc2626",
              }}
            >
              <Text
                style={{ color: "#7f1d1d", fontSize: 13, margin: "0 0 4px" }}
              >
                Förfallet belopp
              </Text>
              <Text
                style={{
                  color: "#dc2626",
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {fmtMoney(balanceAmount, currency)}
              </Text>
              <Text
                style={{ color: "#b91c1c", fontSize: 13, margin: "4px 0 0" }}
              >
                {daysOverdue} {daysOverdue === 1 ? "dag" : "dagar"} sedan
                förfallodatum ({dueDate})
              </Text>
            </Section>

            <Text style={{ color: "#374151", fontSize: 14, margin: "0 0 24px" }}>
              Om betalning inte inkommer inom kort kan ärendet komma att
              överlämnas för vidare hantering. Kontakta oss om du har frågor
              eller behöver diskutera en betalningsplan.
            </Text>

            {portalUrl && (
              <Section style={{ textAlign: "center" }}>
                <Link
                  href={portalUrl}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    padding: "12px 28px",
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Betala omedelbart
                </Link>
              </Section>
            )}
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

export default InvoiceOverdueEmail
