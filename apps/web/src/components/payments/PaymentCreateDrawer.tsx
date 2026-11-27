'use client';

import { useRef, useState } from 'react';
import { useCreatePayment } from '@/hooks/usePayments';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PaystackButton } from './PaystackButton';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField } from '@/components/ui/SelectField';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Paperclip, XClose } from '@untitled-ui/icons-react';

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
    paymentDate: new Date().toISOString(),
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useCreatePayment(onClose);
  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Drawer
      title="Record Payment"
      onClose={onClose}
      width="lg"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          {form.method === 'Card' && form.customerEmail && form.amount ? (
            <PaystackButton
              email={form.customerEmail}
              amountNgn={parseFloat(form.amount)}
              onSuccess={(ref) => {
                const { customerEmail: _ce, ...rest } = form;
                const body = new FormData();
                Object.entries({ ...rest, amount: parseFloat(form.amount), reference: ref, status: 'COMPLETED', paymentDate: form.paymentDate }).forEach(([key, value]) => body.append(key, String(value ?? '')));
                if (proofFile) body.append('receipt', proofFile);
                mutation.mutate(body);
              }}
              label="Charge via Paystack"
            />
          ) : (
            <button
              disabled={!form.amount || mutation.isPending}
              onClick={() => { const { customerEmail: _ce, ...rest } = form; const body = new FormData(); Object.entries({ ...rest, amount: parseFloat(form.amount) }).forEach(([key, value]) => body.append(key, String(value ?? ''))); if (proofFile) body.append('receipt', proofFile); mutation.mutate(body); }}
              className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      }
    >
      <div className="grid w-full gap-5 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Type *</label>
          <SelectField value={form.type} onChange={(value) => set('type', value)} options={PAYMENT_TYPES.map((type) => ({ value: type, label: type.replace(/([a-z])([A-Z])/g, '$1 $2') }))} aria-label="Payment type" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Method *</label>
          <SelectField value={form.method} onChange={(value) => set('method', value)} options={METHODS.map((method) => ({ value: method, label: method }))} aria-label="Payment method" />
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
          <label className="text-sm font-medium">Payment Date and Time *</label>
          <DateTimePicker value={form.paymentDate} onChange={(v) => set('paymentDate', v)} aria-label="Payment date and time" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Proof of Payment</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
          {proofFile ? (
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{proofFile.name}</span>
              <button type="button" onClick={() => { setProofFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                <XClose className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-10 w-full items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted/40">
              <Paperclip className="h-4 w-4" /> Attach receipt or bank confirmation
            </button>
          )}
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

