import type { DOCostSnapshot, DOBalance, DOInvoice } from './types'

const DO_API = 'https://api.digitalocean.com'

async function doFetch(path: string, token: string) {
  const res = await fetch(`${DO_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DO API respondió ${res.status} en ${path}`)
  return res.json()
}

function parseBalance(raw: Record<string, string>): DOBalance {
  return {
    monthToDateUsage: raw.month_to_date_usage ?? '0.00',
    accountBalance: raw.account_balance ?? '0.00',
    monthToDateBalance: raw.month_to_date_balance ?? '0.00',
    generatedAt: raw.generated_at ?? '',
  }
}

function parseInvoice(raw: Record<string, string>): DOInvoice {
  return {
    invoiceUuid: raw.invoice_uuid ?? '',
    amount: raw.amount ?? '0.00',
    invoicePeriod: raw.invoice_period ?? '',
  }
}

export async function getDOCostSnapshot(): Promise<DOCostSnapshot> {
  const token = process.env.DO_TOKEN
  if (!token) {
    return { available: false, reason: 'DO_TOKEN no configurado' }
  }

  try {
    const [balanceData, invoicesData] = await Promise.all([
      doFetch('/v2/customers/my/balance', token),
      doFetch('/v2/customers/my/invoices?per_page=6', token),
    ])

    return {
      available: true,
      balance: parseBalance(balanceData),
      invoicePreview: invoicesData.invoice_preview
        ? parseInvoice(invoicesData.invoice_preview)
        : undefined,
      invoices: (invoicesData.invoices ?? []).slice(0, 5).map(parseInvoice),
    }
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : 'Error consultando DO billing',
    }
  }
}
