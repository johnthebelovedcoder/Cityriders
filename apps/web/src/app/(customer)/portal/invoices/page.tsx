'use client';

import { useQuery } from '@tanstack/react-query';
import { File01, DownloadCloud01, CheckCircle, Clock, AlertCircle, XClose } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

const DRAFT_BADGE = { cls: 'bg-gray-100 text-gray-700', label: 'Draft', icon: File01 };

const STATUS_BADGE: Record<string, { cls: string; label: string; icon: typeof CheckCircle }> = {
  DRAFT:          DRAFT_BADGE,
  SENT:           { cls: 'bg-blue-100 text-blue-700',   label: 'Sent',           icon: Clock },
  PAID:           { cls: 'bg-green-100 text-green-700', label: 'Paid',           icon: CheckCircle },
  PARTIALLY_PAID: { cls: 'bg-amber-100 text-amber-700', label: 'Partial',        icon: Clock },
  OVERDUE:        { cls: 'bg-red-100 text-red-700',     label: 'Overdue',        icon: AlertCircle },
  CANCELLED:      { cls: 'bg-gray-100 text-gray-400',   label: 'Cancelled',      icon: XClose },
};

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: () => api.get('/portal/invoices').then((r) => r.data),
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">Your billing history and payment records</p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-20 text-center">
          <File01 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No invoices yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Invoices are generated after deliveries are completed</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Invoice #', 'Period', 'Items', 'Amount', 'Due Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv: any) => {
                const badge = STATUS_BADGE[inv.status] ?? DRAFT_BADGE;
                const BadgeIcon = badge.icon;
                const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(inv.billingPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv._count?.lineItems ?? 0} deliveries</td>
                    <td className="px-4 py-3 font-semibold">{fmt(inv.totalAmount)}</td>
                    <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {new Date(inv.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue && ' · Overdue'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        <DownloadCloud01 className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
