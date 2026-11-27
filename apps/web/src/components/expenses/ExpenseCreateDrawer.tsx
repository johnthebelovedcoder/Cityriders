'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCheck01, Trash01, Upload01 } from '@untitled-ui/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCreateExpense } from '@/hooks/useExpenses';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField } from '@/components/ui/SelectField';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

const CATEGORIES = [
  { code: 'FUEL', label: 'Fuel' }, { code: 'MAINTENANCE', label: 'Vehicle Maintenance / Repairs' },
  { code: 'TYRES', label: 'Tyres' }, { code: 'SERVICING', label: 'Servicing' }, { code: 'PARTS', label: 'Parts' },
  { code: 'TOLL_PARKING', label: 'Toll / Parking' }, { code: 'RIDER_COMPENSATION', label: 'Rider Compensation' },
  { code: 'OFFICE', label: 'Office' }, { code: 'MARKETING', label: 'Marketing' }, { code: 'OTHER', label: 'Other' },
];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'POS', 'ONLINE', 'OTHER'];
const inp = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const nowLocal = () => new Date().toISOString();

interface Props { onClose: () => void }

export function ExpenseCreateDrawer({ onClose }: Props) {
  const [form, setForm] = useState({ category: 'FUEL', amount: '', description: '', paidTo: '', date: nowLocal(), paymentMethod: '' });
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mutation = useCreateExpense(onClose);
  const { data: configuredCategories } = useQuery({ queryKey: ['expense-categories'], queryFn: () => api.get('/expenses/categories').then((response) => response.data as typeof CATEGORIES) });
  const categories = configuredCategories?.length ? configuredCategories : CATEGORIES;
  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  function chooseReceipt(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Receipt must be 10 MB or smaller'); return; }
    setReceipt(file);
  }

  function submit() {
    const body = new FormData();
    Object.entries({ ...form, amount: String(Number(form.amount)) }).forEach(([key, value]) => body.append(key, value));
    if (receipt) body.append('receipt', receipt);
    mutation.mutate(body);
  }

  return <Drawer title="Add Expense" onClose={onClose} width="md"
    footer={<div className="flex gap-3"><button onClick={onClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button><button disabled={!form.amount || !form.description || mutation.isPending} onClick={submit} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{mutation.isPending ? 'Saving…' : 'Save Expense'}</button></div>}>
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Category *</label><SelectField value={form.category} onChange={(v) => set('category', v)} options={categories.map((category: any) => ({ value: category.code, label: category.label }))} aria-label="Expense category" /></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Amount (NGN) *</label><MoneyInput value={form.amount} onChange={(v) => set('amount', v)} /></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Payee / Vendor</label><input value={form.paidTo} onChange={(e) => set('paidTo', e.target.value)} type="text" className={inp} placeholder="Vendor name" /></div>
        <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Payment Method</label><SelectField value={form.paymentMethod} onChange={(v) => set('paymentMethod', v)} options={PAYMENT_METHODS.map((method) => ({ value: method, label: method.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) }))} placeholder="Choose a method" aria-label="Payment method" /></div>
        <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Date and time *</label><DateTimePicker value={form.date} onChange={(v) => set('date', v)} aria-label="Expense date and time" /></div>
        <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Description *</label><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What was this expense for?" className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-2 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Receipt attachment</label><input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => chooseReceipt(e.target.files?.[0])} />
          {receipt ? <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"><FileCheck01 className="h-5 w-5 shrink-0 text-emerald-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{receipt.name}</p><p className="text-xs text-muted-foreground">{(receipt.size / 1024).toFixed(0)} KB · will be saved with this expense</p></div><button type="button" onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Remove receipt" className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-destructive"><Trash01 className="h-4 w-4" /></button></div> : <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseReceipt(event.dataTransfer.files?.[0]); }} onClick={() => fileRef.current?.click()} className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/10 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted/30"><Upload01 className="h-5 w-5" /><span>Choose a receipt or drag it here</span><span className="text-xs">PDF, JPG, PNG, or WebP · up to 10 MB</span></div>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Expenses above the approval threshold will be queued for manager sign-off.</p>
    </div>
  </Drawer>;
}
