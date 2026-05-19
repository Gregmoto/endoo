export interface BgMaxPayment {
  bgAccount: string
  paymentDate: string
  amount: number
  reference: string
  senderName?: string
  senderAccount?: string
  transactionCode: string
  extraRef?: string
  message?: string
  rejected?: boolean
}

export interface BgMaxParseResult {
  fileDate: string
  fileTime: string
  payments: BgMaxPayment[]
  totalAmount: number
  totalCount: number
  errors: string[]
}
