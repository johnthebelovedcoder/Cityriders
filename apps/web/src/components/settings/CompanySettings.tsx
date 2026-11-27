'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const TEXT_FIELDS = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'currency', label: 'Currency' },
];

const inp = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function CompanySettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const [form, setForm] = useState<Record<string, string>>({});
  const [maxActive, setMaxActive] = useState('5');
  const [maxPackagesPerRider, setMaxPackagesPerRider] = useState('20');
  const [maintenanceReviewDays, setMaintenanceReviewDays] = useState('30');
  const [expenseThreshold, setExpenseThreshold] = useState('');
  const [lowCredit, setLowCredit] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState('30');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('');
  const [vatPercent, setVatPercent] = useState('0');

  useEffect(() => {
    if (settings) {
      setForm({ companyName: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, currency: settings.currency });
      setMaxActive(String(settings.maxActiveAssignments ?? 5));
      setMaxPackagesPerRider(String(settings.maxPackagesPerRider ?? 20));
      setMaintenanceReviewDays(String(settings.maintenanceReviewDays ?? 30));
      setExpenseThreshold(String(settings.expenseApprovalThreshold ?? ''));
      setLowCredit(String(settings.lowCreditThreshold ?? ''));
      setBankName(settings.bankName ?? '');
      setAccountNumber(settings.accountNumber ?? '');
      setAccountName(settings.accountName ?? '');
      setPaymentTermsDays(String(settings.invoicePaymentTermsDays ?? 30));
      setInvoiceFooterNote(settings.invoiceFooterNote ?? '');
      setVatPercent(String(Number(settings.vatRate ?? 0) * 100));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/settings', {
      ...form,
      maxActiveAssignments: parseInt(maxActive, 10) || 5,
      maxPackagesPerRider: parseInt(maxPackagesPerRider, 10) || 20,
      maintenanceReviewDays: parseInt(maintenanceReviewDays, 10) || 30,
      expenseApprovalThreshold: parseFloat(expenseThreshold) || undefined,
      lowCreditThreshold: parseFloat(lowCredit) || undefined,
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
      accountName: accountName || undefined,
      invoicePaymentTermsDays: parseInt(paymentTermsDays, 10) || 30,
      invoiceFooterNote: invoiceFooterNote || undefined,
      vatRate: (parseFloat(vatPercent) || 0) / 100,
    }),
    onSuccess: () => { toast.success('Company settings saved'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  if (!settings) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Company</h2>
        <p className="text-sm text-muted-foreground">These values appear on waybills and email templates</p>
      </div>

      <div className="grid gap-4 max-w-lg">
        {TEXT_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <input
              value={form[key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className={inp}
            />
          </div>
        ))}
      </div>

      <div className="max-w-lg rounded-lg border bg-card p-4 space-y-4">
        <h3 className="font-medium">Operations</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium">Max active assignments per rider</label>
          <input
            type="number"
            min={1}
            max={50}
            value={maxActive}
            onChange={(e) => setMaxActive(e.target.value)}
            className={inp}
          />
          <p className="text-xs text-muted-foreground">Riders at or above this count show a workload warning in the assignments view</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Package capacity warning per rider</label>
          <input type="number" min={1} value={maxPackagesPerRider} onChange={(e) => setMaxPackagesPerRider(e.target.value)} className={inp} />
          <p className="text-xs text-muted-foreground">Dispatch warns when the projected assigned package load exceeds this count.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Repeat maintenance review window (days)</label>
          <input type="number" min={1} value={maintenanceReviewDays} onChange={(e) => setMaintenanceReviewDays(e.target.value)} className={inp} />
          <p className="text-xs text-muted-foreground">Flag repeated work on the same vehicle component within this period.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Expense approval threshold (NGN)</label>
          <input
            type="number"
            value={expenseThreshold}
            onChange={(e) => setExpenseThreshold(e.target.value)}
            className={inp}
          />
          <p className="text-xs text-muted-foreground">Expenses above this amount require manager approval</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Low credit alert threshold (NGN)</label>
          <input
            type="number"
            value={lowCredit}
            onChange={(e) => setLowCredit(e.target.value)}
            className={inp}
          />
          <p className="text-xs text-muted-foreground">Alert when a customer's credit balance falls below this amount</p>
        </div>
      </div>

      <div className="max-w-lg rounded-lg border bg-card p-4 space-y-4">
        <div>
          <h3 className="font-medium">Banking &amp; Invoicing</h3>
          <p className="text-xs text-muted-foreground mt-0.5">These details appear on every invoice and receipt</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Bank name</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inp} placeholder="e.g. First Bank Nigeria" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Account number</label>
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inp} placeholder="10-digit NUBAN" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Account name</label>
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inp} placeholder="Registered account name" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Default payment terms (days)</label>
          <input type="number" min={1} max={365} value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(e.target.value)} className={inp} />
          <p className="text-xs text-muted-foreground">Due date = issue date + this many days. Can be overridden per invoice.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Invoice VAT rate (%)</label>
          <input type="number" min={0} max={100} step="0.01" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={inp} />
          <p className="text-xs text-muted-foreground">Defaults to 0 until the business confirms the applicable tax treatment.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Invoice footer note</label>
          <textarea
            rows={3}
            value={invoiceFooterNote}
            onChange={(e) => setInvoiceFooterNote(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Payment instructions, late-payment policy, thank-you message…"
          />
        </div>
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {save.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

