export interface DOBalance {
  monthToDateUsage: string
  accountBalance: string
  monthToDateBalance: string
  generatedAt: string
}

export interface DOInvoice {
  invoiceUuid: string
  amount: string
  invoicePeriod: string
}

export interface DOCostSnapshot {
  available: boolean
  reason?: string
  balance?: DOBalance
  invoicePreview?: DOInvoice
  invoices?: DOInvoice[]
}
