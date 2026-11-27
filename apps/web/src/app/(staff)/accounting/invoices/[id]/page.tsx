'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DownloadCloud01, ChevronDown, ChevronUp, Plus } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { SelectField } from '@/components/ui/SelectField';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-50 text-blue-700 border border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border border-red-200',
  VOID: 'bg-gray-200 text-gray-500 line-through',
  DISPUTED: 'bg-orange-50 text-orange-700 border border-orange-200',
};

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'POS', 'ONLINE', 'OTHER'];

function RecordPaymentModal({ invoiceId, remaining, onClose }: { invoiceId: string; remaining: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ amount: remaining > 0 ? String(remaining) : '', method: 'BANK_TRANSFER', reference: '', notes: '' });
  const mut = useMutation({
    mutationFn: (data: typeof form) => api.post(`/invoices/${invoiceId}/payments`, { ...data, amount: Number(data.amount) }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', invoiceId] }); onClose(); },
  });
  const inp = 'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Record Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mut.mutate(form); }} className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₦)</label>
            <input className={inp} type="number" min="1" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <SelectField value={form.method} onChange={(method) => setForm((f) => ({ ...f, method }))} options={PAYMENT_METHODS.map((method) => ({ value: method, label: method.replace('_', ' ') }))} aria-label="Payment method" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Bank ref, receipt #…" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          {mut.error && <p className="text-xs text-destructive">{(mut.error as any).response?.data?.message ?? 'Error recording payment'}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {mut.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showItems, setShowItems] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data),
  });

  const markSent = useMutation({
    mutationFn: () => api.patch(`/invoices/${id}/status`, { status: 'SENT' }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/invoices/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!inv) return <div className="py-20 text-center text-muted-foreground">Invoice not found</div>;

  const totalPaid = (inv.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const remaining = Number(inv.totalAmount) - totalPaid;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-wrap gap-2">
          {inv.status === 'DRAFT' && (
            <button onClick={() => markSent.mutate()} disabled={markSent.isPending}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              Mark as Sent
            </button>
          )}
          {!['PAID', 'VOID'].includes(inv.status) && (
            <button onClick={() => setShowPayModal(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Record Payment
            </button>
          )}
          {!['PAID', 'VOID', 'DISPUTED'].includes(inv.status) && (
            <button
              onClick={() => { if (window.confirm('Mark this invoice as DISPUTED? This flags it for review.')) updateStatus.mutate('DISPUTED'); }}
              disabled={updateStatus.isPending}
              className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50"
            >
              Mark Disputed
            </button>
          )}
          {inv.status !== 'VOID' && (
            <button
              onClick={() => { if (window.confirm('VOID this invoice? This cannot be undone.')) updateStatus.mutate('VOID'); }}
              disabled={updateStatus.isPending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Void Invoice
            </button>
          )}
          {inv.status === 'DISPUTED' && (
            <button
              onClick={() => updateStatus.mutate('SENT')}
              disabled={updateStatus.isPending}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Resolve Dispute
            </button>
          )}
          <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/invoices/${id}/pdf`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">
            <DownloadCloud01 className="h-3.5 w-3.5" /> PDF
          </a>
        </div>
      </div>

      {/* Invoice card */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Invoice</p>
            <h1 className="text-xl font-bold font-mono">{inv.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{inv.customer?.name}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {inv.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-6 py-5 sm:grid-cols-4 text-sm border-b">
          {[
            { label: 'Issue Date', val: new Date(inv.createdAt).toLocaleString() },
            { label: 'Due Date', val: new Date(inv.dueDate).toLocaleString() },
            { label: 'Billing Period', val: `${new Date(inv.billingPeriodStart).toLocaleString()} – ${new Date(inv.billingPeriodEnd).toLocaleString()}` },
            { label: 'Created By', val: `${inv.createdBy?.firstName} ${inv.createdBy?.lastName}` },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="font-medium text-xs">{val}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end px-6 py-5 border-b">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="font-mono">{fmt(inv.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT ({(Number(inv.vatRate) * 100).toFixed(1)}%)</span>
              <span className="font-mono">{fmt(inv.vatAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span><span className="font-mono">{fmt(inv.totalAmount)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between text-emerald-600 text-sm">
                  <span>Paid</span><span className="font-mono">− {fmt(totalPaid)}</span>
                </div>
                <div className={`flex justify-between font-semibold border-t pt-2 ${remaining <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span>Balance</span><span className="font-mono">{fmt(Math.max(remaining, 0))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div>
          <button onClick={() => setShowItems(v => !v)}
            className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors">
            Line Items ({(inv.lineItems ?? []).length})
            {showItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showItems && (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    {['Description', 'Tracking #', 'Qty', 'Unit Price', 'Total'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(inv.lineItems ?? []).map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.trackingNumber ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5 font-mono">{fmt(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold">{fmt(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      {(inv.payments ?? []).length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left">
                  {['Date', 'Amount', 'Method', 'Reference', 'Recorded By'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(p.recordedAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600">{fmt(p.amount)}</td>
                    <td className="px-4 py-2.5">{p.method.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.recordedBy ? `${p.recordedBy.firstName} ${p.recordedBy.lastName}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPayModal && <RecordPaymentModal invoiceId={id} remaining={remaining} onClose={() => setShowPayModal(false)} />}
    </div>
  );
}
