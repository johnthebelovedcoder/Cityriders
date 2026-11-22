'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wallet01, CheckCircle, Clock, DownloadCloud01, Edit02, File01, XClose } from '@untitled-ui/icons-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { api } from '@/lib/api';

function PayslipModal({ entry, period, onClose }: { entry: any; period: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const displayPeriod = (() => {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  })();
  const basePay = entry.deliveries * entry.ratePerDelivery;
  const deductions = Math.round(basePay * 0.03); // 3% platform deduction
  const netPay = basePay + (entry.bonus ?? 0) - deductions;

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Payslip — ${entry.riderName}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; color: #111; padding: 40px; max-width: 680px; margin: auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
      .logo { font-size: 20px; font-weight: 900; }
      .sub { font-size: 11px; color: #666; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }
      .title { font-size: 14px; font-weight: 700; text-align: right; }
      .meta { font-size: 12px; color: #555; text-align: right; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 8px; }
      .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 13px; }
      .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #111; font-size: 15px; font-weight: 700; margin-top: 4px; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
      .paid { background: #d1fae5; color: #065f46; }
      .pending { background: #fef3c7; color: #92400e; }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-xl border bg-card shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Payslip Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <File01 className="h-3.5 w-3.5" /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <XClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Payslip content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div ref={printRef}>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-foreground pb-4 mb-5">
              <div>
                <p className="text-xl font-black">CityRider</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Logistics</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">Pay Slip</p>
                <p className="text-xs text-muted-foreground">{displayPeriod}</p>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {entry.status === 'PAID' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Rider info */}
            <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rider</p>
                <p className="font-semibold">{entry.riderName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rider ID</p>
                <p className="font-mono text-xs">{entry.id}</p>
              </div>
              {entry.paidAt && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payment Date</p>
                  <p>{new Date(entry.paidAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Earnings */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Earnings</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{entry.deliveries} deliveries × {fmt(entry.ratePerDelivery)}</span>
                  <span className="font-medium tabular-nums">{fmt(basePay)}</span>
                </div>
                {(entry.bonus ?? 0) > 0 && (
                  <div className="flex justify-between border-b py-1.5">
                    <span className="text-muted-foreground">Performance bonus</span>
                    <span className="font-medium tabular-nums text-indigo-600">+{fmt(entry.bonus)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Deductions</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">Platform fee (3%)</span>
                  <span className="font-medium tabular-nums text-red-600">−{fmt(deductions)}</span>
                </div>
              </div>
            </div>

            {/* Net pay */}
            <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
              <span className="text-base font-bold">Net Pay</span>
              <span className="text-xl font-black tabular-nums text-primary">{fmt(netPay)}</span>
            </div>

            <p className="mt-5 text-center text-[10px] text-muted-foreground">
              CityRider Logistics • 12 Marina Street, Lagos Island • ops@cityrider.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  PAID:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DRAFT:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function fmt(n: number) { return `₦${n.toLocaleString()}`; }

export default function PayrollPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bonusEdit, setBonusEdit] = useState<{ id: string; value: string } | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [payslipEntry, setPayslipEntry] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', period],
    queryFn: () => api.get('/payroll', { params: { period } }).then((r) => r.data),
  });

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

  const summary = data?.summary ?? { totalPayroll: 0, paidOut: 0, pending: 0, riderCount: 0 };
  const allRecords: any[] = data?.records ?? [];
  const records = search
    ? allRecords.filter((r) => r.riderName?.toLowerCase().includes(search.toLowerCase()))
    : allRecords;
  const unpaid = allRecords.filter((r) => r.status !== 'PAID');
  const unpaidCount = unpaid.length;
  const paidCount = allRecords.length - unpaidCount;
  const paidPct = allRecords.length > 0 ? Math.round((paidCount / allRecords.length) * 100) : 0;

  function exportCsv() {
    const rows = [
      ['Rider', 'Deliveries', 'Rate/Delivery', 'Base Pay', 'Bonus', 'Net Pay', 'Status'],
      ...allRecords.map((r) => {
        const base = r.deliveries * r.ratePerDelivery;
        const deductions = Math.round(base * 0.03);
        const net = base + (r.bonus ?? 0) - deductions;
        return [r.riderName, r.deliveries, r.ratePerDelivery, base, r.bonus ?? 0, net, r.status];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function payAll() {
    setPayingAll(true);
    try {
      await Promise.all(unpaid.map((r) => api.patch(`/payroll/${r.id}/pay`)));
      toast.success(`Marked ${unpaidCount} rider${unpaidCount !== 1 ? 's' : ''} as paid`);
      qc.invalidateQueries({ queryKey: ['payroll', period] });
    } catch {
      toast.error('Some payments could not be processed');
    } finally {
      setPayingAll(false);
    }
  }

  const displayPeriod = (() => {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Rider earnings and payment processing</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button onClick={exportCsv} disabled={!allRecords.length} className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
            <DownloadCloud01 className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Payroll"
          value={fmt(summary.totalPayroll)}
          sub={`${summary.riderCount} rider${summary.riderCount !== 1 ? 's' : ''} this period`}
          icon={Wallet01}
          iconCls="text-blue-600 bg-blue-50"
          valueColor="text-blue-600"
        />
        <MetricCard
          label="Paid Out"
          value={fmt(summary.paidOut)}
          sub="Disbursed to riders"
          icon={CheckCircle}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="Pending"
          value={fmt(summary.pending)}
          sub="Awaiting payment"
          icon={Clock}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Riders Paid"
          value={paidCount}
          sub={`${paidPct}% of this period`}
          icon={CheckCircle}
          iconCls="text-indigo-600 bg-indigo-50"
          valueColor="text-indigo-600"
        />
      </div>

      {/* Alert + Pay All */}
      {unpaidCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-5 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{unpaidCount} rider{unpaidCount > 1 ? 's' : ''}</strong> {unpaidCount > 1 ? 'have' : 'has'} unpaid earnings this period.
          </p>
          <button
            onClick={payAll}
            disabled={payingAll}
            className="inline-flex h-8 items-center rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {payingAll ? 'Processing...' : `Pay All ${unpaidCount}`}
          </button>
        </div>
      )}

      {/* Payroll Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <div className="border-b px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pay Period: {displayPeriod}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Rate: ₦5,000 / delivery</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rider…"
            className="h-9 w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {allRecords.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">{paidCount} / {allRecords.length} paid</div>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} />
              </div>
              <div className="text-xs font-medium text-green-600">{paidPct}%</div>
            </div>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {['Rider', 'Deliveries', 'Base Pay', 'Bonus', 'Total', 'Status', 'Paid At', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading payroll...</td></tr>
            )}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No riders found for this period</td></tr>
            )}
            {records.map((e) => (
              <tr key={e.id} className={`border-b last:border-0 transition-colors ${e.status === 'PAID' ? 'bg-green-50/30 dark:bg-green-900/5' : 'hover:bg-muted/20'}`}>
                <td className="px-4 py-3 font-medium">{e.riderName}</td>
                <td className="px-4 py-3 tabular-nums">{e.deliveries}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(e.deliveries * e.ratePerDelivery)}</td>
                <td className="px-4 py-3">
                  {bonusEdit !== null && bonusEdit.id === e.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">₦</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={bonusEdit.value}
                        onChange={(ev) => setBonusEdit({ id: e.id, value: ev.target.value })}
                        className="h-7 w-24 rounded-lg border px-2 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        autoFocus
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') updateBonus.mutate({ id: e.id, bonus: Number(bonusEdit.value) });
                          if (ev.key === 'Escape') setBonusEdit(null);
                        }}
                      />
                      <button onClick={() => updateBonus.mutate({ id: e.id, bonus: Number(bonusEdit.value) })} className="rounded px-1.5 py-0.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700">Save</button>
                      <button onClick={() => setBonusEdit(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setBonusEdit({ id: e.id, value: String(e.bonus) })}
                      className="group flex items-center gap-1 tabular-nums text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                      title="Click to edit bonus"
                    >
                      <span>{e.bonus > 0 ? `+${fmt(e.bonus)}` : '-'}</span>
                      <Edit02 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">{fmt(e.total)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[e.status] ?? ''}`}>
                    {e.status === 'DRAFT' ? 'Draft' : e.status === 'PAID' ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {e.paidAt ? new Date(e.paidAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {e.status !== 'PAID' ? (
                      <button
                        onClick={() => markPaid.mutate(e.id)}
                        disabled={markPaid.isPending}
                        className="inline-flex h-7 items-center rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" /> Paid
                      </span>
                    )}
                    <button
                      onClick={() => setPayslipEntry(e)}
                      title="Generate payslip"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <File01 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length > 0 && (
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground" colSpan={4}>Totals</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{fmt(allRecords.reduce((s: number, r: any) => s + r.total, 0))}</td>
                <td colSpan={3} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {payslipEntry && <PayslipModal entry={payslipEntry} period={period} onClose={() => setPayslipEntry(null)} />}
    </div>
  );
}