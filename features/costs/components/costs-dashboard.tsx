'use client'

import { useState } from 'react'
import { RefreshCw, DollarSign, Receipt, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DOCostSnapshot, DOInvoice } from '@/features/costs/server/types'

function usd(value: string) {
  return `$${parseFloat(value).toFixed(2)}`
}

function periodLabel(period: string) {
  if (!period) return '—'
  const [year, month] = period.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border p-5 shadow-sm',
      highlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className={cn('mt-2 text-2xl font-bold', highlight ? 'text-blue-700' : 'text-slate-900')}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function InvoiceRow({ invoice, preview }: { invoice: DOInvoice; preview?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <Receipt size={14} className="text-slate-400" />
        <span className="text-sm text-slate-700">{periodLabel(invoice.invoicePeriod)}</span>
        {preview && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            En curso
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-slate-900">{usd(invoice.amount)}</span>
    </div>
  )
}

export function CostsDashboard({ initial }: { initial: DOCostSnapshot }) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/costs', { cache: 'no-store' })
      const json = await res.json()
      setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Costos</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">DigitalOcean</h1>
          <p className="mt-1 text-sm text-slate-500">Balance y consumo de la cuenta.</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {!data.available ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">Sin datos</p>
          <p className="mt-1 text-sm text-red-600">{data.reason}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={TrendingUp}
              label="Uso este mes"
              value={usd(data.balance!.monthToDateUsage)}
              highlight
            />
            <StatCard
              icon={DollarSign}
              label="Balance cuenta"
              value={usd(data.balance!.accountBalance)}
              sub="Crédito disponible"
            />
            <StatCard
              icon={Receipt}
              label="Balance mes"
              value={usd(data.balance!.monthToDateBalance)}
              sub="Cargos acumulados"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Facturas</p>
            {data.invoicePreview && (
              <InvoiceRow invoice={data.invoicePreview} preview />
            )}
            {data.invoices?.map((inv) => (
              <InvoiceRow key={inv.invoiceUuid} invoice={inv} />
            ))}
            {!data.invoicePreview && !data.invoices?.length && (
              <p className="text-sm text-slate-400">Sin facturas aún.</p>
            )}
          </div>

          {data.balance?.generatedAt && (
            <p className="text-right text-xs text-slate-400">
              Actualizado: {new Date(data.balance.generatedAt).toLocaleString('es-MX')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
