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

export type InvoiceReminderEmailProps = BrandingProps & {
  contactName: string
  invoiceNumber: string
  dueDate: string
  currency: string
  balanceAmount: number
  portalUrl?: string
}

export function InvoiceReminderEmail({
  orgName,
  logoUrl,
  primaryColor,
  contactName,
  invoiceNumber,
  dueDate,
  currency,
  balanceAmount,
  portalUrl,
}: InvoiceReminderEmailProps) {
  const color = primaryColor ?? PRIMARY
  const previewText = `Påminnelse: Faktura ${invoiceNumber} förfaller ${dueDate}`

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
              Påminnelse om obetald faktura
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {contactName},
              <br />
              <br />
              Vi vill påminna dig om att faktura <strong>{invoiceNumber}</strong>{" "}
              ännu inte har betalats. Förfallodatum är <strong>{dueDate}</strong>.
            </Text>

            <Section
              style={{
                backgroundColor: "#fff7ed",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 24,
                borderLeft: "4px solid #f97316",
              }}
            >
              <Text
                style={{ color: "#9a3412", fontSize: 13, margin: "0 0 4px" }}
              >
                Utestående belopp
              </Text>
              <Text
                style={{
                  color: "#9a3412",
                  fontSize: 24,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {fmtMoney(balanceAmount, currency)}
              </Text>
              <Text
                style={{ color: "#c2410c", fontSize: 13, margin: "4px 0 0" }}
              >
                Förfaller {dueDate}
              </Text>
            </Section>

            <Text style={{ color: "#374151", fontSize: 14, margin: "0 0 24px" }}>
              Om du redan har betalat, vänligen bortse från detta meddelande. Om
              du har frågor angående fakturan är du välkommen att kontakta oss.
            </Text>

            {portalUrl && (
              <Section style={{ textAlign: "center" }}>
                <Link
                  href={portalUrl}
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
                  Betala faktura
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

export default InvoiceReminderEmail
