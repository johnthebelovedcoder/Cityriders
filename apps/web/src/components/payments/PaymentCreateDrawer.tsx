'use client';

import { useState } from 'react';
import { useCreatePayment } from '@/hooks/usePayments';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PaystackButton } from './PaystackButton';
import { Drawer } from '@/components/ui/Drawer';

const PAYMENT_TYPES = ['DeliveryFee', 'Credit', 'RiderRemittance', 'Refund'];
const METHODS = ['Cash', 'BankTransfer', 'Card', 'Credit'];

const FIELD_LABELS: Record<string, string> = {
  amount: 'Amount (NGN) *',
  reference: 'Reference',
  notes: 'Notes',
};

interface Props { onClose: () => void }

export function PaymentCreateDrawer({ onClose }: Props) {
  const [form, setForm] = useState({
    type: 'DeliveryFee',
    method: 'Cash',
    amount: '',
    reference: '',
    notes: '',
    customerEmail: '',
  });

  const mutation = useCreatePayment(onClose);
  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Drawer
      title="Record Payment"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          {form.method === 'Card' && form.customerEmail && form.amount ? (
            <PaystackButton
              email={form.customerEmail}
              amountNgn={parseFloat(form.amount)}
              onSuccess={(ref) => {
                const { customerEmail: _ce, ...rest } = form;
                mutation.mutate({ ...rest, amount: parseFloat(form.amount), reference: ref, status: 'Paid' });
              }}
              label="Charge via Paystack"
            />
          ) : (
            <button
              disabled={!form.amount || mutation.isPending}
              onClick={() => { const { customerEmail: _ce, ...rest } = form; mutation.mutate({ ...rest, amount: parseFloat(form.amount) }); }}
              className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Type *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Method *</label>
          <select value={form.method} onChange={(e) => set('method', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{FIELD_LABELS.amount}</label>
          <MoneyInput value={form.amount} onChange={(v) => set('amount', v)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{FIELD_LABELS.reference}</label>
          <input value={form.reference} onChange={(e) => set('reference', e.target.value)} type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        {form.method === 'Card' && (
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium">Customer Email (for Paystack)</label>
            <input value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)}
              type="email" placeholder="customer@example.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        )}
      </div>
    </Drawer>
  );
}

