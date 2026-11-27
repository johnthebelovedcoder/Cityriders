'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, Edit02, File01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { PayslipModal } from './PayslipModal';
import { MoneyInput } from '@/components/ui/MoneyInput';

const fmt = (n: number) => `₦${Number(n).toLocaleString()}`;

const STATUS_CLS: Record<string, string> = {
  PAID:    'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  DRAFT:   'bg-gray-100 text-gray-500',
};

const DEPT_CLS: Record<string, string> = {
  Operations: 'bg-blue-50 text-blue-700',
  Finance:    'bg-violet-50 text-violet-700',
  Support:    'bg-teal-50 text-teal-700',
  Delivery:   'bg-amber-50 text-amber-700',
};

export function PayrollRunTable({ records, period, isLoading }: { records: any[]; period: string; isLoading: boolean }) {
  const qc = useQueryClient();
  const [payslipEntry, setPayslipEntry] = useState<any>(null);
  const [bonusEdit, setBonusEdit] = useState<{ id: string; value: string } | null>(null);

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/payroll/${id}/pay`),
    onSuccess: () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['payroll', period] }); },
    onError: () => toast.error('Failed to update'),
  });

  const updateBonus = useMutation({
    mutationFn: ({ id, bonus }: { id: string; bonus: number }) => api.patch(`/payroll/${id}/bonus`, { bonus }),
    onSuccess: () => { toast.success('Bonus updated'); qc.invalidateQueries({ queryKey: ['payroll', period] }); setBonusEdit(null); },
    onError: () => toast.error('Failed to update bonus'),
  });

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading payroll…</div>;
  if (!records.length) return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">No payroll run for this period yet.</p>
      <p className="text-xs text-muted-foreground mt-1">Click "Run Payroll" to generate pay for all employees.</p>
    </div>
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {['Employee', 'Dept', 'Gross Pay', 'PAYE', 'Pension', 'NHF', 'Net Pay', 'Status', 'Bonus', ''].map((h) => (
                <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((e) => (
              <tr key={e.id} className={`border-b last:border-0 transition-colors ${e.status === 'PAID' ? 'bg-green-50/30 dark:bg-green-900/5' : 'hover:bg-muted/20'}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{e.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground">{e.role?.replace('_', ' ')}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${DEPT_CLS[e.department] ?? 'bg-gray-100 text-gray-600'}`}>{e.department}</span>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{fmt(e.grossPay)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">{fmt(e.taxPAYE)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">{fmt(e.pension)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">{fmt(e.nhf)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-primary">{fmt(e.netPay)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[e.status] ?? ''}`}>
                    {e.status === 'PAID' ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {bonusEdit?.id === e.id ? (
                    <div className="flex items-center gap-1">
                      <MoneyInput
                        value={bonusEdit?.value ?? ''}
                        onChange={(v) => setBonusEdit({ id: e.id, value: v })}
                        className="h-7 w-28 rounded-lg border pl-6 pr-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <button onClick={() => updateBonus.mutate({ id: e.id, bonus: Number(bonusEdit?.value ?? 0) })} className="rounded px-1.5 py-0.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setBonusEdit({ id: e.id, value: String(e.bonus ?? 0) })}
                      className="group flex items-center gap-1 tabular-nums text-indigo-600 hover:text-indigo-800 text-sm" title="Edit bonus">
                      {(e.bonus ?? 0) > 0 ? `+${fmt(e.bonus)}` : <span className="text-muted-foreground">—</span>}
                      <Edit02 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {e.status !== 'PAID' ? (
                      <button onClick={() => markPaid.mutate(e.id)} disabled={markPaid.isPending}
                        className="inline-flex h-7 items-center rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                        Mark Paid
                      </button>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Paid</span>
                    )}
                    <button onClick={() => setPayslipEntry(e)} title="View payslip"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground">
                      <File01 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30 text-sm font-medium">
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground" colSpan={2}>Totals</td>
              <td className="px-4 py-3 tabular-nums font-semibold">{fmt(records.reduce((s, r) => s + r.grossPay, 0))}</td>
              <td className="px-4 py-3 tabular-nums text-red-600">{fmt(records.reduce((s, r) => s + r.taxPAYE, 0))}</td>
              <td className="px-4 py-3 tabular-nums text-red-600">{fmt(records.reduce((s, r) => s + r.pension, 0))}</td>
              <td className="px-4 py-3 tabular-nums text-red-600">{fmt(records.reduce((s, r) => s + r.nhf, 0))}</td>
              <td className="px-4 py-3 tabular-nums font-bold text-primary">{fmt(records.reduce((s, r) => s + r.netPay, 0))}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
      {payslipEntry && <PayslipModal entry={payslipEntry} period={period} onClose={() => setPayslipEntry(null)} />}
    </>
  );
}
