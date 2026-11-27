'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CurrencyDollar, Clock, CheckCircle, Eye } from '@untitled-ui/icons-react';
import { useExpenses, useApproveExpense, useRejectExpense } from '@/hooks/useExpenses';
import { ExpenseCreateDrawer } from '@/components/expenses/ExpenseCreateDrawer';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { Drawer } from '@/components/ui/Drawer';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { SelectField } from '@/components/ui/SelectField';
import { ExpenseDetailDrawer } from '@/components/expenses/ExpenseDetailDrawer';

const CAT_BADGE: Record<string, string> = {
  FUEL: 'bg-orange-100 text-orange-700', MAINTENANCE: 'bg-blue-100 text-blue-700',
  TYRES: 'bg-purple-100 text-purple-700', SERVICING: 'bg-indigo-100 text-indigo-700', PARTS: 'bg-cyan-100 text-cyan-700',
  TOLL_PARKING: 'bg-violet-100 text-violet-700', RIDER_COMPENSATION: 'bg-rose-100 text-rose-700',
  OFFICE: 'bg-gray-100 text-gray-700', MARKETING: 'bg-pink-100 text-pink-700', OTHER: 'bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Approved' ? 'bg-green-100 text-green-700' :
    status === 'PendingApproval' ? 'bg-yellow-100 text-yellow-700' :
    status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status === 'PendingApproval' ? 'Pending' : status}</span>;
}

function fmt(n: number) { return `${n.toLocaleString()}`; }

function RejectDialog({ expenseId, description, onClose }: { expenseId: string; description: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reject = useRejectExpense();

  function submit() {
    if (!reason.trim()) return;
    reject.mutate({ id: expenseId, reason: reason.trim() }, { onSuccess: onClose });
  }

  return (
    <Drawer
      title="Reject Expense"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            onClick={submit}
            disabled={!reason.trim() || reject.isPending}
            className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {reject.isPending ? 'Rejecting' : 'Reject'}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground truncate">{description}</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Reason for rejection <span className="text-red-500">*</span></label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Insufficient justification, duplicate entry"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </Drawer>
  );
}

export default function ExpensesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; description: string } | null>(null);
  const [expenseTarget, setExpenseTarget] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { range, setRange } = usePeriodFilter('this-month');
  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: () => api.get('/expenses/categories').then((response) => response.data as Array<{ code: string; label: string }>) });

  const { data, isLoading } = useExpenses({ search: search || undefined, category, status: statusFilter, from: range.from, to: range.to });
  const approve = useApproveExpense();

  const expenses = data?.data ?? [];
  const summary = data?.summary;
  const pendingCount = expenses.filter((e: any) => e.status === 'PendingApproval').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Record and categorise operating expenses</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="inline-flex h-9 items-center rounded-md bg-yellow-100 px-3 text-sm font-medium text-yellow-800">
              {pendingCount} pending approval
            </span>
          )}
          <button onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + Add Expense
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="This Month"
          value={summary ? fmt(summary.thisMonth) : '-'}
          sub="Total outgoing MTD"
          icon={CurrencyDollar}
          iconCls="text-rose-600 bg-rose-50"
          valueColor="text-rose-600"
        />
        <MetricCard
          label="Last Month"
          value={summary ? fmt(summary.lastMonth) : '-'}
          sub={summary && summary.lastMonth > 0 ? `${Math.abs(Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100))}% vs now` : 'Previous month'}
          icon={CurrencyDollar}
          iconCls="text-muted-foreground bg-muted"
          valueColor="text-muted-foreground"
        />
        <MetricCard
          label="Pending Approval"
          value={pendingCount}
          sub="Expenses awaiting sign-off"
          icon={Clock}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Approved"
          value={expenses.filter((e: any) => e.status === 'Approved').length}
          sub="Signed off this period"
          icon={CheckCircle}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description, payee…"
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SelectField className="min-w-44" value={category} onChange={setCategory} aria-label="Filter by category" options={[{ value: '', label: 'All Categories' }, ...categories.map((item: any) => ({ value: item.code, label: item.label }))]} />
        <SelectField className="min-w-40" value={statusFilter} onChange={setStatusFilter} aria-label="Filter by approval status" options={[{ value: '', label: 'All Statuses' }, ...['Approved', 'PendingApproval', 'Rejected'].map((s) => ({ value: s, label: s === 'PendingApproval' ? 'Pending approval' : s }))]} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {['Category', 'Amount', 'Description', 'Payee', 'Payment method', 'Date and time', 'Status', 'Receipt', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && expenses.length === 0 && (
              <tr><td colSpan={9} className="py-2">
                <EmptyState title="No expenses found" description="Log your first expense to start tracking operational costs." />
              </td></tr>
            )}
            {expenses.map((e: any) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CAT_BADGE[e.category] ?? ''}`}>{e.category}</span></td>
                <td className="px-4 py-3 tabular-nums font-semibold">₦{fmt(e.amount)}</td>
                <td className="px-4 py-3 max-w-xs truncate">{e.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.payee ?? e.paidTo ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.paymentMethod?.replaceAll('_', ' ') ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(e.expenseDate ?? e.date).toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => setExpenseTarget(e)} title="View expense details" aria-label={`View expense details for ${e.description}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                </td>
                <td className="px-4 py-3">
                  {e.status === 'PendingApproval' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve.mutate(e.id)}
                        disabled={approve.isPending}
                        className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <span className="text-muted-foreground/40">|</span>
                      <button
                        onClick={() => setRejectTarget({ id: e.id, description: e.description })}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {e.status === 'Rejected' && e.rejectionReason && (
                    <span className="text-xs text-muted-foreground italic">{e.rejectionReason}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <ExpenseCreateDrawer onClose={() => setShowCreate(false)} />}
      {expenseTarget && <ExpenseDetailDrawer expense={expenseTarget} onClose={() => setExpenseTarget(null)} />}
      {rejectTarget && (
        <RejectDialog
          expenseId={rejectTarget.id}
          description={rejectTarget.description}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

