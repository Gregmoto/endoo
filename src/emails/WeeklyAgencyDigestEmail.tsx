import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

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

export type WeeklyAgencyDigestEmailProps = {
  agencyName: string
  weekLabel: string
  stats: {
    newInvoices: number
    totalBilled: number
    currency: string
    overdueCount: number
    newContacts: number
  }
  topClients: Array<{
    name: string
    invoiceCount: number
    total: number
  }>
  digestUrl: string
  unsubscribeUrl?: string
}

export function WeeklyAgencyDigestEmail({
  agencyName,
  weekLabel,
  stats,
  topClients,
  digestUrl,
  unsubscribeUrl,
}: WeeklyAgencyDigestEmailProps) {
  const previewText = `Veckans sammanfattning för ${agencyName} — ${weekLabel}`

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
              style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}
            >
              {agencyName}
            </Text>
            <Text
              style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: 0 }}
            >
              Veckans sammanfattning · {weekLabel}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px" }}>
            <Heading
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 20px",
              }}
            >
              Översikt
            </Heading>

            {/* Stats grid */}
            <Row style={{ marginBottom: 24 }}>
              <Column style={{ width: "50%", paddingRight: 8 }}>
                <Section
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderRadius: 8,
                    padding: "16px 18px",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{ color: "#15803d", fontSize: 12, margin: "0 0 4px" }}
                  >
                    FAKTURERAT
                  </Text>
                  <Text
                    style={{
                      color: "#14532d",
                      fontSize: 20,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {fmtMoney(stats.totalBilled, stats.currency)}
                  </Text>
                </Section>
                <Section
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 8,
                    padding: "16px 18px",
                  }}
                >
                  <Text
                    style={{ color: "#6b7280", fontSize: 12, margin: "0 0 4px" }}
                  >
                    NYA FAKTUROR
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontSize: 24,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {stats.newInvoices}
                  </Text>
                </Section>
              </Column>
              <Column style={{ width: "50%", paddingLeft: 8 }}>
                <Section
                  style={{
                    backgroundColor:
                      stats.overdueCount > 0 ? "#fef2f2" : "#f9fafb",
                    borderRadius: 8,
                    padding: "16px 18px",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        stats.overdueCount > 0 ? "#b91c1c" : "#6b7280",
                      fontSize: 12,
                      margin: "0 0 4px",
                    }}
                  >
                    FÖRFALLNA
                  </Text>
                  <Text
                    style={{
                      color:
                        stats.overdueCount > 0 ? "#dc2626" : "#111827",
                      fontSize: 24,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {stats.overdueCount}
                  </Text>
                </Section>
                <Section
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: 8,
                    padding: "16px 18px",
                  }}
                >
                  <Text
                    style={{ color: "#6b7280", fontSize: 12, margin: "0 0 4px" }}
                  >
                    NYA KONTAKTER
                  </Text>
                  <Text
                    style={{
                      color: "#111827",
                      fontSize: 24,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {stats.newContacts}
                  </Text>
                </Section>
              </Column>
            </Row>

            {/* Top clients */}
            {topClients.length > 0 && (
              <>
                <Heading
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 12px",
                  }}
                >
                  Topp klienter denna vecka
                </Heading>
                <Section style={{ marginBottom: 24 }}>
                  <Row
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      paddingBottom: 6,
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
                        Klient
                      </Text>
                    </Column>
                    <Column style={{ width: "25%", textAlign: "center" }}>
                      <Text
                        style={{
                          color: "#6b7280",
                          fontSize: 11,
                          fontWeight: 600,
                          margin: 0,
                          textTransform: "uppercase",
                        }}
                      >
                        Fakturor
                      </Text>
                    </Column>
                    <Column style={{ width: "25%", textAlign: "right" }}>
                      <Text
                        style={{
                          color: "#6b7280",
                          fontSize: 11,
                          fontWeight: 600,
                          margin: 0,
                          textTransform: "uppercase",
                        }}
                      >
                        Totalt
                      </Text>
                    </Column>
                  </Row>
                  {topClients.map((client, i) => (
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
                          style={{ color: "#111827", fontSize: 14, margin: 0, fontWeight: 500 }}
                        >
                          {client.name}
                        </Text>
                      </Column>
                      <Column style={{ width: "25%", textAlign: "center" }}>
                        <Text
                          style={{ color: "#374151", fontSize: 14, margin: 0 }}
                        >
                          {client.invoiceCount}
                        </Text>
                      </Column>
                      <Column style={{ width: "25%", textAlign: "right" }}>
                        <Text
                          style={{ color: "#111827", fontSize: 14, fontWeight: 600, margin: 0 }}
                        >
                          {fmtMoney(client.total, stats.currency)}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Section>
              </>
            )}

            <Section style={{ textAlign: "center" }}>
              <Link
                href={digestUrl}
                style={{
                  backgroundColor: PRIMARY,
                  color: "#ffffff",
                  padding: "12px 28px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Visa fullständig rapport
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
              Skickat via Endoo · {agencyName}
              {unsubscribeUrl && (
                <>
                  {" · "}
                  <Link
                    href={unsubscribeUrl}
                    style={{ color: "#9ca3af", textDecoration: "underline" }}
                  >
                    Avprenumerera
                  </Link>
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WeeklyAgencyDigestEmail
