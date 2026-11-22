'use client';

import { useState } from 'react';
import { useCreateExpense } from '@/hooks/useExpenses';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Drawer } from '@/components/ui/Drawer';

const CATEGORIES = ['Fuel', 'Maintenance', 'Salary', 'Bonus', 'Office', 'Marketing', 'Other'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'POS', 'ONLINE', 'OTHER'];

const inp = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props { onClose: () => void }

export function ExpenseCreateDrawer({ onClose }: Props) {
  const [form, setForm] = useState({
    category: 'Fuel',
    amount: '',
    description: '',
    paidTo: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: '',
    attachmentUrl: '',
  });

  const mutation = useCreateExpense(onClose);
  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Drawer
      title="Add Expense"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            disabled={!form.amount || !form.description || mutation.isPending}
            onClick={() => mutation.mutate({ ...form, amount: parseFloat(form.amount) })}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide">Category *</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">Amount (NGN) *</label>
            <MoneyInput value={form.amount} onChange={(v) => set('amount', v)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">Payee / Vendor</label>
            <input value={form.paidTo} onChange={(e) => set('paidTo', e.target.value)} type="text" className={inp} placeholder="Vendor name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={inp}>
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide">Date *</label>
            <input value={form.date} onChange={(e) => set('date', e.target.value)} type="date" className={inp} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Description *</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
            placeholder="What was this expense for?"
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Receipt URL</label>
          <input
            value={form.attachmentUrl}
            onChange={(e) => set('attachmentUrl', e.target.value)}
            type="url"
            className={inp}
            placeholder="https://… (paste a link to your receipt)"
          />
          {form.attachmentUrl && (
            <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Preview receipt ↗
            </a>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Expenses above the approval threshold will be queued for manager sign-off.
        </p>
      </div>
    </Drawer>
  );
}