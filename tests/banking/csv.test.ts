import { describe, it, expect } from "vitest"
import { parseCsv, detectCsvSeparator, detectColumns } from "@/lib/banking/csv/parser"

describe("detectCsvSeparator", () => {
  it("detects semicolon separator", () => {
    expect(detectCsvSeparator("datum;belopp;referens\n2026-01-01;100;ref1")).toBe(";")
  })

  it("detects comma separator", () => {
    expect(detectCsvSeparator("date,amount,reference\n2026-01-01,100,ref1")).toBe(",")
  })

  it("detects tab separator", () => {
    expect(detectCsvSeparator("date\tamount\treference\n2026-01-01\t100\tref1")).toBe("\t")
  })

  it("defaults to comma when ambiguous", () => {
    expect(detectCsvSeparator("single")).toBe(",")
  })
})

describe("detectColumns", () => {
  it("returns headers from semicolon CSV", () => {
    const content = "datum;belopp;referens\n2026-01-01;100;ref1"
    expect(detectColumns(content)).toEqual(["datum", "belopp", "referens"])
  })

  it("returns headers from comma CSV", () => {
    const content = "date,amount,reference\n2026-01-01,100,ref1"
    expect(detectColumns(content)).toEqual(["date", "amount", "reference"])
  })

  it("strips quotes from headers", () => {
    const content = '"date","amount","reference"\n2026-01-01,100,ref1'
    expect(detectColumns(content)).toEqual(["date", "amount", "reference"])
  })
})

describe("parseCsv — semicolon-separated Swedish CSV", () => {
  const csvContent = [
    "datum;belopp;referens;avsändare",
    "2026-01-15;368,00;000000001234;Kund AB",
    "2026-01-16;1 234,56;000000005678;Annan Kund",
  ].join("\n")

  const mapping = { date: "datum", amount: "belopp", reference: "referens", sender: "avsändare" }

  it("parses all rows", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.transactions).toHaveLength(2)
  })

  it("parses amount with comma decimal to öre", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.transactions[0].amount).toBe(36800)
  })

  it("parses amount with space thousands separator", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.transactions[1].amount).toBe(123456)
  })

  it("parses payment date", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.transactions[0].paymentDate).toBe("2026-01-15")
  })

  it("parses sender name", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.transactions[0].senderName).toBe("Kund AB")
  })

  it("returns headers", () => {
    const result = parseCsv(csvContent, mapping, { separator: ";", amountFormat: "decimal_comma" })
    expect(result.headers).toEqual(["datum", "belopp", "referens", "avsändare"])
  })
})

describe("parseCsv — comma-separated CSV", () => {
  const csvContent = [
    "date,amount,reference",
    "2026-02-01,100.00,REF001",
    "2026-02-02,250.50,REF002",
  ].join("\n")

  const mapping = { date: "date", amount: "amount", reference: "reference" }

  it("parses two rows", () => {
    const result = parseCsv(csvContent, mapping)
    expect(result.transactions).toHaveLength(2)
  })

  it("parses dot decimal amounts", () => {
    const result = parseCsv(csvContent, mapping)
    expect(result.transactions[0].amount).toBe(10000)
    expect(result.transactions[1].amount).toBe(25050)
  })
})

describe("parseCsv — date format handling", () => {
  it("parses DD/MM/YYYY format", () => {
    const content = "date,amount,reference\n15/01/2026,100.00,REF"
    const result = parseCsv(
      content,
      { date: "date", amount: "amount", reference: "reference" },
      { dateFormat: "DD/MM/YYYY" },
    )
    expect(result.transactions[0].paymentDate).toBe("2026-01-15")
  })

  it("parses MM/DD/YYYY format", () => {
    const content = "date,amount,reference\n01/15/2026,100.00,REF"
    const result = parseCsv(
      content,
      { date: "date", amount: "amount", reference: "reference" },
      { dateFormat: "MM/DD/YYYY" },
    )
    expect(result.transactions[0].paymentDate).toBe("2026-01-15")
  })
})

describe("parseCsv — missing optional columns", () => {
  it("works without sender and account columns", () => {
    const content = "date,amount,reference\n2026-01-01,50.00,REF123"
    const result = parseCsv(content, { date: "date", amount: "amount", reference: "reference" })
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].senderName).toBeUndefined()
    expect(result.transactions[0].senderAccount).toBeUndefined()
  })

  it("returns error for missing required column", () => {
    const content = "date,amount,reference\n2026-01-01,50.00,REF123"
    const result = parseCsv(content, { date: "datum", amount: "amount", reference: "reference" })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.transactions).toHaveLength(0)
  })
})

describe("parseCsv — invalid amounts", () => {
  it("adds error for invalid amount and skips row", () => {
    const content = "date,amount,reference\n2026-01-01,invalid,REF"
    const result = parseCsv(content, { date: "date", amount: "amount", reference: "reference" })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.transactions).toHaveLength(0)
  })
})

describe("parseCsv — empty content", () => {
  it("returns error for empty content", () => {
    const result = parseCsv("", { date: "date", amount: "amount", reference: "reference" })
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe("parseCsv — account column", () => {
  it("parses sender account when mapping provided", () => {
    const content = "date,amount,reference,account\n2026-01-01,100.00,REF,12345-6789"
    const result = parseCsv(content, {
      date: "date",
      amount: "amount",
      reference: "reference",
      account: "account",
    })
    expect(result.transactions[0].senderAccount).toBe("12345-6789")
  })
})

describe("parseCsv — rawRow", () => {
  it("includes all columns in rawRow", () => {
    const content = "date,amount,reference,extra\n2026-01-01,100.00,REF,somevalue"
    const result = parseCsv(content, { date: "date", amount: "amount", reference: "reference" })
    expect(result.transactions[0].rawRow["extra"]).toBe("somevalue")
  })
})
