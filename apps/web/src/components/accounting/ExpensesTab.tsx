'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendDown01, Clock } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { MetricCard } from '@/components/ui/MetricCard';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'RIDER_COMPENSATION', 'OFFICE', 'MARKETING', 'OTHER'];

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    category: 'FUEL', amount: '', description: '', payee: '',
    expenseDate: today, riderId: '', vehicleId: '',
  });

  const { data: riders } = useQuery({
    queryKey: ['riders-active'],
    queryFn: () => api.get('/riders/active').then(r => r.data),
  });
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data?.data ?? r.data ?? []).catch(() => []),
  });

  const mut = useMutation({
    mutationFn: () => api.post('/expenses', {
      ...form,
      amount: Number(form.amount),
      riderId: form.riderId || undefined,
      vehicleId: form.vehicleId || undefined,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); onClose(); },
  });

  const inp = 'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Drawer
      title="Add Expense"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button
            type="submit"
            form="add-expense-form"
            disabled={mut.isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mut.isPending ? 'Saving…' : 'Add Expense'}
          </button>
        </div>
      }
    >
      <form id="add-expense-form" onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className={inp} value={form.category} onChange={f('category')}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₦)</label>
            <input className={inp} type="number" min="1" required value={form.amount} onChange={f('amount')} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input className={inp} required value={form.description} onChange={f('description')} placeholder="e.g. Fuel for dispatch route" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Payee <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className={inp} value={form.payee} onChange={f('payee')} placeholder="Vendor / person paid" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input className={inp} type="date" required value={form.expenseDate} onChange={f('expenseDate')} />
          </div>
        </div>
        {(form.category === 'FUEL' || form.category === 'MAINTENANCE' || form.category === 'RIDER_COMPENSATION') && (
          <div>
            <label className="block text-sm font-medium mb-1">Rider <span className="text-muted-foreground font-normal">(optional)</span></label>
            <select className={inp} value={form.riderId} onChange={f('riderId')}>
              <option value="">— None —</option>
              {(riders ?? []).map((r: any) => (
                <option key={r.id} value={r.id}>{r.user.firstName} {r.user.lastName}</option>
              ))}
            </select>
          </div>
        )}
        {(form.category === 'FUEL' || form.category === 'MAINTENANCE') && (vehicles ?? []).length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle <span className="text-muted-foreground font-normal">(optional)</span></label>
            <select className={inp} value={form.vehicleId} onChange={f('vehicleId')}>
              <option value="">— None —</option>
              {(vehicles ?? []).map((v: any) => (
                <option key={v.id} value={v.id}>{v.plateNumber ?? v.id}</option>
              ))}
            </select>
          </div>
        )}
        {mut.error && <p className="text-xs text-destructive">{(mut.error as any).response?.data?.message ?? 'Error saving expense'}</p>}
      </form>
    </Drawer>
  );
}

export function ExpensesTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [riderId, setRiderId] = useState('');
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', riderId, category],
    queryFn: () => api.get('/expenses', { params: { riderId: riderId || undefined, category: category || undefined } }).then(r => r.data),
  });

  const { data: riders } = useQuery({ queryKey: ['riders-active'], queryFn: () => api.get('/riders/active').then(r => r.data) });

  const expenses = data?.data ?? [];
  const summary = data?.summary;

  const byCategory = expenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="This Month"
            value={fmt(summary.thisMonth)}
            sub="Total expenses MTD"
            icon={TrendDown01}
            iconCls="text-rose-600 bg-rose-50"
            valueColor="text-rose-600"
          />
          <MetricCard
            label="Last Month"
            value={fmt(summary.lastMonth)}
            sub="Previous month total"
            icon={TrendDown01}
            iconCls="text-muted-foreground bg-muted"
            valueColor="text-muted-foreground"
          />
          <MetricCard
            label="Month-over-Month"
            value={summary.lastMonth > 0 ? `${summary.thisMonth > summary.lastMonth ? '+' : '-'}${(Math.abs(summary.thisMonth - summary.lastMonth) / summary.lastMonth * 100).toFixed(1)}%` : '—'}
            sub={summary.thisMonth > summary.lastMonth ? 'Expenses increased' : 'Expenses decreased'}
            icon={Clock}
            iconCls={summary.thisMonth > summary.lastMonth ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}
            valueColor={summary.thisMonth > summary.lastMonth ? 'text-rose-600' : 'text-emerald-600'}
          />
          <MetricCard
            label="Entries"
            value={expenses.length}
            sub="Expense records"
            icon={Plus}
            iconCls="text-blue-600 bg-blue-50"
            valueColor="text-blue-600"
          />
        </div>
      )}

      {Object.keys(byCategory).length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byCategory).map(([cat, amt]: [string, any]) => (
            <div key={cat} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <span className="text-sm font-medium">{cat.replace('_', ' ')}</span>
              <span className="font-mono text-sm font-semibold">{fmt(amt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b">
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <select value={riderId} onChange={e => setRiderId(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">All Riders</option>
              {(riders ?? []).map((r: any) => (
                <option key={r.id} value={r.id}>{r.user.firstName} {r.user.lastName}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> Add Expense
          </button>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {['Category', 'Amount', 'Description', 'Rider', 'Vehicle', 'Payee', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No expenses found</td></tr>
              ) : expenses.map((e: any) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{e.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.rider ? `${e.rider.user.firstName} ${e.rider.user.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.vehicle?.plateNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.payee ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.expenseDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

