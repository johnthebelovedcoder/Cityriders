'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendDown01, Clock, Eye } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { ExpenseCreateDrawer } from '@/components/expenses/ExpenseCreateDrawer';
import { MetricCard } from '@/components/ui/MetricCard';
import { SelectField } from '@/components/ui/SelectField';
import { ExpenseDetailDrawer } from '@/components/expenses/ExpenseDetailDrawer';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

export function ExpensesTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [expenseTarget, setExpenseTarget] = useState<any | null>(null);
  const [riderId, setRiderId] = useState('');
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', riderId, category],
    queryFn: () => api.get('/expenses', { params: { riderId: riderId || undefined, category: category || undefined } }).then(r => r.data),
  });

  const { data: riders } = useQuery({ queryKey: ['riders-active'], queryFn: () => api.get('/riders/active').then(r => r.data) });
  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: () => api.get('/expenses/categories').then(r => r.data as Array<{ code: string; label: string }>) });

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
            <SelectField className="min-w-36" value={category} onChange={setCategory} aria-label="Filter expenses by category" options={[{ value: '', label: 'All Categories' }, ...categories.map((item) => ({ value: item.code, label: item.label }))]} />
            <SelectField className="min-w-36" value={riderId} onChange={setRiderId} aria-label="Filter expenses by rider" options={[{ value: '', label: 'All Riders' }, ...(riders ?? []).map((r: any) => ({ value: r.id, label: `${r.user.firstName} ${r.user.lastName}` }))]} />
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
                {['Category', 'Amount', 'Description', 'Rider', 'Vehicle', 'Payee', 'Date and time', 'Receipt'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No expenses found</td></tr>
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
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.expenseDate).toLocaleString()}</td>
                  <td className="px-4 py-3"><button onClick={() => setExpenseTarget(e)} title="View expense details" aria-label={`View expense details for ${e.description}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <ExpenseCreateDrawer onClose={() => setShowAdd(false)} />}
      {expenseTarget && <ExpenseDetailDrawer expense={expenseTarget} onClose={() => setExpenseTarget(null)} />}
    </div>
  );
}

