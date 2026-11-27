'use client';

import { useState } from 'react';
import { Eye, FileCheck01 } from '@untitled-ui/icons-react';
import { Drawer } from '@/components/ui/Drawer';
import { ExpenseReceiptViewer } from './ExpenseReceiptViewer';

interface Props { expense: any; onClose: () => void }

export function ExpenseDetailDrawer({ expense, onClose }: Props) {
  const [showReceipt, setShowReceipt] = useState(false);
  const value = (text: unknown) => text == null || text === '' ? '—' : String(text);
  return <>
    <Drawer title="Expense details" onClose={onClose} width="lg">
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</p><p className="mt-1 text-2xl font-bold">₦{Number(expense.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p></div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['Category', String(expense.category ?? '').replaceAll('_', ' ')],
            ['Payment method', String(expense.paymentMethod ?? '—').replaceAll('_', ' ')],
            ['Payee / Vendor', expense.payee ?? expense.paidTo],
            ['Expense date and time', (expense.expenseDate ?? expense.date) ? new Date(expense.expenseDate ?? expense.date).toLocaleString() : '—'],
            ['Approval status', expense.approvalStatus ?? expense.status],
            ['Recorded by', expense.recordedBy ? `${expense.recordedBy.firstName} ${expense.recordedBy.lastName}` : '—'],
            ['Recorded at', expense.createdAt ? new Date(expense.createdAt).toLocaleString() : '—'],
          ].map(([label, text]) => <div key={label}><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value(text)}</dd></div>)}
        </dl>
        <div><p className="text-xs font-medium text-muted-foreground">Description</p><p className="mt-1 whitespace-pre-wrap text-sm">{value(expense.description)}</p></div>
        {expense.approvalNote && <div><p className="text-xs font-medium text-muted-foreground">Approval note</p><p className="mt-1 text-sm">{expense.approvalNote}</p></div>}
        {expense.hasReceipt && <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"><div className="flex min-w-0 items-center gap-2"><FileCheck01 className="h-5 w-5 shrink-0 text-emerald-600" /><span className="truncate text-sm">{expense.attachmentFileName ?? 'Receipt attached'}</span></div><button onClick={() => setShowReceipt(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"><Eye className="h-3.5 w-3.5" /> View receipt</button></div>}
      </div>
    </Drawer>
    {showReceipt && <ExpenseReceiptViewer expenseId={expense.id} onClose={() => setShowReceipt(false)} />}
  </>;
}
