import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
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

export type InvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

export type InvoiceSentEmailProps = BrandingProps & {
  contactName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  currency: string
  totalAmount: number
  lines: InvoiceLine[]
  notes?: string
  portalUrl?: string
}

export function InvoiceSentEmail({
  orgName,
  logoUrl,
  primaryColor,
  contactName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  currency,
  totalAmount,
  lines,
  notes,
  portalUrl,
}: InvoiceSentEmailProps) {
  const color = primaryColor ?? PRIMARY
  const totalFormatted = fmtMoney(totalAmount, currency)
  const previewText = `Faktura ${invoiceNumber} från ${orgName} — ${totalFormatted}`

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
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
              }}
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
              Faktura {invoiceNumber}
            </Heading>
            <Text style={{ color: "#374151", fontSize: 15, margin: "0 0 24px" }}>
              Hej {contactName},
              <br />
              <br />
              Tack för ditt förtroende. Bifogat finner du faktura{" "}
              <strong>{invoiceNumber}</strong>.
            </Text>

            {/* Invoice meta */}
            <Section
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <Row>
                <Column>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 12,
                      margin: "0 0 2px",
                    }}
                  >
                    FAKTURADATUM
                  </Text>
                  <Text
                    style={{ color: "#111827", fontSize: 14, margin: 0, fontWeight: 600 }}
                  >
                    {invoiceDate}
                  </Text>
                </Column>
                <Column>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 12,
                      margin: "0 0 2px",
                    }}
                  >
                    FÖRFALLODATUM
                  </Text>
                  <Text
                    style={{ color: "#111827", fontSize: 14, margin: 0, fontWeight: 600 }}
                  >
                    {dueDate}
                  </Text>
                </Column>
                <Column>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 12,
                      margin: "0 0 2px",
                    }}
                  >
                    TOTALBELOPP
                  </Text>
                  <Text
                    style={{
                      color: color,
                      fontSize: 16,
                      margin: 0,
                      fontWeight: 700,
                    }}
                  >
                    {totalFormatted}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Line items */}
            <Section style={{ marginBottom: 24 }}>
              <Row
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: 8,
                  marginBottom: 4,
                }}
              >
                <Column style={{ width: "50%" }}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    Beskrivning
                  </Text>
                </Column>
                <Column style={{ width: "15%", textAlign: "center" }}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    Antal
                  </Text>
                </Column>
                <Column style={{ width: "15%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    À-pris
                  </Text>
                </Column>
                <Column style={{ width: "20%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    Summa
                  </Text>
                </Column>
              </Row>
              {lines.map((line, i) => (
                <Row
                  key={i}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <Column style={{ width: "50%" }}>
                    <Text
                      style={{ color: "#111827", fontSize: 13, margin: 0 }}
                    >
                      {line.description}
                    </Text>
                    {line.taxRate > 0 && (
                      <Text
                        style={{
                          color: "#9ca3af",
                          fontSize: 11,
                          margin: "2px 0 0",
                        }}
                      >
                        Moms {line.taxRate}%
                      </Text>
                    )}
                  </Column>
                  <Column style={{ width: "15%", textAlign: "center" }}>
                    <Text
                      style={{ color: "#374151", fontSize: 13, margin: 0 }}
                    >
                      {line.quantity}
                    </Text>
                  </Column>
                  <Column style={{ width: "15%", textAlign: "right" }}>
                    <Text
                      style={{ color: "#374151", fontSize: 13, margin: 0 }}
                    >
                      {fmtMoney(line.unitPrice, currency)}
                    </Text>
                  </Column>
                  <Column style={{ width: "20%", textAlign: "right" }}>
                    <Text
                      style={{
                        color: "#111827",
                        fontSize: 13,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {fmtMoney(line.total, currency)}
                    </Text>
                  </Column>
                </Row>
              ))}
              <Row style={{ paddingTop: 12 }}>
                <Column style={{ width: "80%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#111827",
                      fontSize: 15,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    Totalt att betala:
                  </Text>
                </Column>
                <Column style={{ width: "20%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: color,
                      fontSize: 15,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {totalFormatted}
                  </Text>
                </Column>
              </Row>
            </Section>

            {notes && (
              <Section
                style={{
                  backgroundColor: "#fffbeb",
                  borderRadius: 8,
                  padding: "14px 18px",
                  marginBottom: 24,
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <Text
                  style={{ color: "#92400e", fontSize: 13, margin: 0 }}
                >
                  <strong>Notering:</strong> {notes}
                </Text>
              </Section>
            )}

            {portalUrl && (
              <Section style={{ textAlign: "center", marginTop: 8 }}>
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
                  Visa &amp; betala faktura
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

export default InvoiceSentEmail
