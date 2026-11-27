'use client';

import { useState } from 'react';
import { CurrencyDollar, Clock, Wallet01, TrendUp01, Eye } from '@untitled-ui/icons-react';
import { usePayments, useRunSettlement } from '@/hooks/usePayments';
import { PaymentCreateDrawer } from '@/components/payments/PaymentCreateDrawer';
import { PaymentDetailDrawer } from '@/components/payments/PaymentDetailDrawer';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/SelectField';
import { api } from '@/lib/api';

const TYPE_BADGE: Record<string, string> = {
  DeliveryFee: 'bg-blue-100 text-blue-700',
  Credit: 'bg-purple-100 text-purple-700',
  RiderRemittance: 'bg-amber-100 text-amber-700',
  Refund: 'bg-red-100 text-red-700',
};
const STATUS_BADGE: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Failed: 'bg-red-100 text-red-700',
  Refunded: 'bg-gray-100 text-gray-500',
};

function fmt(n: number) { return `${n.toLocaleString()}`; }


export default function PaymentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const { range, setRange } = usePeriodFilter('this-month');

  const { data, isLoading } = usePayments({ search: search || undefined, type, status, method, from: range.from, to: range.to });
  const settlement = useRunSettlement();

  const payments = data?.data ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Record and review all money movements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (window.confirm('Mark all pending payments as completed?')) settlement.mutate(); }}
            disabled={settlement.isPending}
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-60">
            {settlement.isPending ? 'Running...' : 'Run Settlement'}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            + Record Payment
          </button>
        </div>
      </div>

      {/* Period filter + Stats */}
      <div className="flex items-center gap-3">
        <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Collected"
          value={summary ? fmt(summary.totalCollected) : '-'}
          sub="Paid payments"
          icon={CurrencyDollar}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="Pending"
          value={summary ? fmt(summary.totalPending) : '-'}
          sub="Awaiting payment"
          icon={Clock}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Remitted to Riders"
          value={summary ? fmt(summary.totalRemitted) : '-'}
          sub="Settlement total"
          icon={Wallet01}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
        <MetricCard
          label="Net Revenue"
          value={summary ? fmt(summary.totalCollected - summary.totalRemitted) : '-'}
          sub="After rider payouts"
          icon={TrendUp01}
          iconCls="text-violet-600 bg-violet-50"
          valueColor="text-violet-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, customer, tracking…"
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {([['Type', type, setType, ['DeliveryFee', 'Credit', 'RiderRemittance', 'Refund']], ['Status', status, setStatus, ['Paid', 'Pending', 'Failed', 'Refunded']], ['Method', method, setMethod, ['Cash', 'BankTransfer', 'Card', 'Credit']]] as const).map(([label, val, setter, opts]) => (
          <SelectField key={label} className="min-w-36" value={val} onChange={(value) => (setter as any)(value)} aria-label={`Filter by payment ${label.toLowerCase()}`} options={[{ value: '', label: `All ${label}s` }, ...opts.map((option: string) => ({ value: option, label: option }))]} />
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {['Type', 'Amount', 'Method', 'Status', 'Reference', 'Entity', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && payments.length === 0 && (
              <tr><td colSpan={8} className="py-2">
                <EmptyState title="No payments found" description="Payments will appear here once packages are delivered and settled." />
              </td></tr>
            )}
            {payments.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[p.type] ?? ''}`}>{p.type}</span></td>
                <td className="px-4 py-3 tabular-nums font-semibold">₦{fmt(p.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-muted-foreground">{p.reference ?? '-'}</span>
                    {p.package?.trackingNumber && (
                      <a href={`/packages/${p.package.id ?? ''}`} className="font-mono text-xs text-primary hover:underline">
                        {p.package.trackingNumber}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{p.customer?.name ?? (p.rider?.user ? `${p.rider.user.firstName} ${p.rider.user.lastName}` : '-')}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(p.paymentDate ?? p.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button type="button" title="View details" aria-label="View payment details" className="rounded p-1.5 text-primary hover:bg-muted" onClick={() => setDetailPayment(p)}>
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <PaymentCreateDrawer onClose={() => setShowCreate(false)} />}
      {detailPayment && <PaymentDetailDrawer payment={detailPayment} onClose={() => setDetailPayment(null)} />}
    </div>
  );
}

