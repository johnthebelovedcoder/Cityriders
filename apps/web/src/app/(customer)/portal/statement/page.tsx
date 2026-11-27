'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

const money = (value: number | string) => `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function StatementPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['portal-statement'], queryFn: () => api.get('/portal/statement').then((r) => r.data) });
  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading statement…</div>;
  if (isError) return <div className="py-20 text-center text-red-600">Could not load your account statement.</div>;
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold tracking-tight">Account Statement</h1><p className="text-muted-foreground">Invoices, payments, and account adjustments for {data?.customer?.name}</p></header>
    <div className="rounded-xl border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Closing balance</p><p className="mt-1 text-2xl font-bold">{money(data?.closingBalance ?? 0)}</p></div>
    {!data?.rows?.length ? <div className="rounded-xl border bg-card px-6 py-16 text-center"><CreditCard01 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40"/><p className="text-sm">No account activity yet</p></div> : <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-left">{['Date','Type','Reference','Description','Debit','Credit','Balance'].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y">{data.rows.map((row: any, i: number) => <tr key={`${row.reference ?? row.type}-${i}`}><td className="whitespace-nowrap px-4 py-3 text-xs">{new Date(row.date).toLocaleString('en-NG')}</td><td className="px-4 py-3">{row.type.replace(/_/g, ' ')}</td><td className="px-4 py-3 font-mono text-xs">{row.reference ?? '—'}</td><td className="px-4 py-3">{row.description}</td><td className="px-4 py-3 text-right">{row.debit ? money(row.debit) : '—'}</td><td className="px-4 py-3 text-right">{row.credit ? money(row.credit) : '—'}</td><td className="px-4 py-3 text-right font-semibold">{money(row.balance)}</td></tr>)}</tbody></table></div>}
  </div>;
}
