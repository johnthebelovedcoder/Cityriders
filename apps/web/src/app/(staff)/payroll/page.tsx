'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wallet01, CheckCircle, Clock, TrendUp01, DownloadCloud01, Play, Users01 } from '@untitled-ui/icons-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { api } from '@/lib/api';
import { PayrollRunTable } from '@/components/payroll/PayrollRunTable';
import { EmployeesTab } from '@/components/payroll/EmployeesTab';

const fmt = (n: number) => `₦${Number(n).toLocaleString()}`;

export default function PayrollPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<'runs' | 'employees'>('runs');

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', period],
    queryFn: () => api.get('/payroll', { params: { period } }).then((r) => r.data),
  });

  const runPayroll = useMutation({
    mutationFn: () => api.post('/payroll/run', { period }).then((r) => r.data),
    onSuccess: () => { toast.success('Payroll generated for all employees'); qc.invalidateQueries({ queryKey: ['payroll', period] }); },
    onError: () => toast.error('Failed to run payroll'),
  });

  const summary = data?.summary ?? {};
  const records: any[] = data?.records ?? [];
  const unpaidCount = records.filter((r) => r.status !== 'PAID').length;
  const paidCount = records.length - unpaidCount;
  const paidPct = records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0;

  function exportCsv() {
    const rows = [
      ['Employee', 'Role', 'Dept', 'Gross Pay', 'PAYE', 'Pension', 'NHF', 'Net Pay', 'Status'],
      ...records.map((r) => [r.employeeName, r.role, r.department, r.grossPay, r.taxPAYE, r.pension, r.nhf, r.netPay, r.status]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const displayPeriod = (() => { const [y, m] = period.split('-'); return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }); })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Company-wide payroll — staff salaries &amp; rider earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button onClick={exportCsv} disabled={!records.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
            <DownloadCloud01 className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => runPayroll.mutate()} disabled={runPayroll.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Play className="h-3.5 w-3.5" /> {runPayroll.isPending ? 'Generating…' : 'Run Payroll'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Gross" value={fmt(summary.totalGross ?? 0)} sub={`${summary.employeeCount ?? 0} employees`} icon={Wallet01} iconCls="text-blue-600 bg-blue-50" valueColor="text-blue-600" />
        <MetricCard label="Total Net Pay" value={fmt(summary.totalNet ?? 0)} sub={`${fmt(summary.paidOut ?? 0)} paid out`} icon={CheckCircle} iconCls="text-green-600 bg-green-50" valueColor="text-green-600" />
        <MetricCard label="Total PAYE" value={fmt(summary.totalPAYE ?? 0)} sub="Tax withheld this period" icon={TrendUp01} iconCls="text-red-600 bg-red-50" valueColor="text-red-600" />
        <MetricCard label="Pension (EE)" value={fmt(summary.totalPension ?? 0)} sub="Employee contributions 8%" icon={Clock} iconCls="text-amber-600 bg-amber-50" valueColor="text-amber-600" />
      </div>

      {/* Unpaid alert */}
      {unpaidCount > 0 && records.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-5 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{unpaidCount} employee{unpaidCount > 1 ? 's' : ''}</strong> {unpaidCount > 1 ? 'have' : 'has'} unpaid earnings — {paidCount} of {records.length} paid ({paidPct}%).
          </p>
          <div className="flex items-center gap-3">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-amber-200"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} /></div>
            <span className="text-xs font-medium text-green-700">{paidPct}%</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl border bg-card">
        <div className="flex border-b">
          {(['runs', 'employees'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'runs' ? <><Wallet01 className="h-3.5 w-3.5" /> Pay Runs — {displayPeriod}</> : <><Users01 className="h-3.5 w-3.5" /> Employees</>}
            </button>
          ))}
        </div>
        <div className="p-0">
          {tab === 'runs' ? (
            <PayrollRunTable records={records} period={period} isLoading={isLoading} />
          ) : (
            <div className="p-4"><EmployeesTab /></div>
          )
          }
        </div>
      </div>
    </div>
  );
}
