'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, XClose, CurrencyDollar, CheckCircle, AlertOctagon, File01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { MetricCard } from '@/components/ui/MetricCard';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-50 text-blue-700 border border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border border-red-200',
  VOID: 'bg-gray-200 text-gray-500',
  DISPUTED: 'bg-orange-50 text-orange-700 border border-orange-200',
};

function GenerateInvoiceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: customers } = useQuery({
    queryKey: ['customers-invoice'],
    queryFn: () => api.get('/customers?paymentTerms=INVOICE').then(r => r.data?.data ?? r.data ?? []),
  });

  const mut = useMutation({
    mutationFn: () => api.post('/invoices', { customerId, notes: notes || undefined }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onClose(); },
  });

  const inp = 'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Generate Invoice</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XClose className="h-4 w-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select className={inp} required value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {(customers ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Only invoice-billing customers shown. Invoice covers all uninvoiced delivered packages.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. November batch" />
          </div>
          {mut.error && <p className="text-xs text-destructive">{(mut.error as any).response?.data?.message ?? 'No uninvoiced packages found'}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={mut.isPending || !customerId} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {mut.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InvoicesTab() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [search, setSearch] = useState('');
  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  });
  const invoices = search
    ? allInvoices.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : allInvoices;

  const outstanding = invoices.filter((i: any) => i.status !== 'PAID').reduce((s: number, i: any) => s + Number(i.totalAmount), 0);
  const paid = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + Number(i.totalAmount), 0);
  const overdueCount = invoices.filter((i: any) => i.status === 'OVERDUE').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Outstanding"
          value={fmt(outstanding)}
          sub="Unpaid + overdue"
          icon={CurrencyDollar}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Paid This Month"
          value={fmt(paid)}
          sub="Collected from invoices"
          icon={CheckCircle}
          iconCls="text-emerald-600 bg-emerald-50"
          valueColor="text-emerald-600"
        />
        <MetricCard
          label="Overdue"
          value={overdueCount}
          sub="Past due date, unpaid"
          icon={AlertOctagon}
          iconCls={overdueCount > 0 ? 'text-rose-600 bg-rose-50' : 'text-muted-foreground bg-muted'}
          valueColor={overdueCount > 0 ? 'text-rose-600' : undefined}
        />
        <MetricCard
          label="Total Invoices"
          value={allInvoices.length}
          sub="All invoice records"
          icon={File01}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="h-8 flex-1 min-w-36 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> Generate Invoice
          </button>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Invoice #', 'Customer', 'Packages', 'Amount', 'Due Date', 'Status', 'Aging'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/accounting/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/accounting/invoices/${inv.id}`} className="block hover:text-primary">
                      {inv.customer?.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv._count?.lineItems ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {inv.status !== 'PAID' && (() => {
                      const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
                      return days > 0 ? (
                        <span className={`font-semibold ${days > 30 ? 'text-rose-600' : 'text-amber-600'}`}>{days}d overdue</span>
                      ) : null;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showGenerate && <GenerateInvoiceModal onClose={() => setShowGenerate(false)} />}
    </div>
  );
}

