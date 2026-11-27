'use client';

import { useRef } from 'react';
import { XClose, File01 } from '@untitled-ui/icons-react';

const fmt = (n: number) => `₦${Number(n).toLocaleString()}`;

export function PayslipModal({ entry, period, onClose }: { entry: any; period: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [y, m] = period.split('-');
  const displayPeriod = new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const isStaff = entry.employmentType !== 'RIDER';

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Payslip — ${entry.employeeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#2A2522;background:#fff;padding:0}
.page{max-width:680px;margin:0 auto;padding:0}
/* Header band */
.header{background:#FFB217;padding:28px 36px 24px;display:flex;justify-content:space-between;align-items:flex-start}
.logo-wrap{display:flex;align-items:center;gap:12px}
.logo-circle{width:44px;height:44px;border-radius:50%;background:#AE1805;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#FFB217;letter-spacing:-.5px;flex-shrink:0}
.logo-text{font-size:22px;font-weight:900;color:#2A2522;letter-spacing:-.5px}
.logo-sub{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#2A2522;opacity:.6;margin-top:1px}
.slip-label{text-align:right}
.slip-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#2A2522}
.slip-period{font-size:12px;color:#2A2522;opacity:.7;margin-top:2px}
.badge{display:inline-block;margin-top:5px;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.badge-paid{background:#2A2522;color:#FFB217}
.badge-pending{background:rgba(42,37,34,.15);color:#2A2522}
/* Body */
.body{padding:28px 36px}
/* Employee grid */
.emp-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:24px;background:#EFE7DC;border-radius:10px;padding:16px 20px}
.emp-item .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B625A}
.emp-item .val{font-size:12px;font-weight:600;color:#2A2522;margin-top:1px}
/* Section heading */
.sec-head{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#AE1805;margin:18px 0 8px;display:flex;align-items:center;gap:6px}
.sec-head::after{content:'';flex:1;height:1px;background:#AE1805;opacity:.2}
/* Rows */
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(42,37,34,.07);font-size:12px}
.row .lbl{color:#6B625A}
.row .val{font-weight:600;font-variant-numeric:tabular-nums}
.row.total{border-bottom:none;border-top:1px solid rgba(42,37,34,.15);padding-top:8px;margin-top:2px}
.row.total .lbl{font-weight:700;color:#2A2522}
.row.total .val{font-weight:700}
.row.deduct .val{color:#AE1805}
.row.bonus .val{color:#1a7f43}
/* Net pay */
.net-band{background:#2A2522;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
.net-band .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#EFE7DC}
.net-band .val{font-size:22px;font-weight:900;color:#FFB217;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
/* Footer */
.foot{margin-top:20px;padding-top:14px;border-top:1px solid rgba(42,37,34,.1);display:flex;justify-content:space-between;align-items:center}
.foot-left{font-size:9px;color:#6B625A;line-height:1.6}
.foot-stamp{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6B625A;opacity:.6}
@media print{body{padding:0}@page{margin:16mm 12mm}}
</style></head><body><div class="page">${content}</div></body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-[640px] rounded-2xl overflow-hidden shadow-2xl bg-card">
        {/* Modal toolbar */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold text-sm">Payslip Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-semibold text-white"
              style={{ background: '#AE1805' }}>
              <File01 className="h-3.5 w-3.5" /> Print / PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <XClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable payslip */}
        <div className="overflow-y-auto max-h-[80vh]">
          <div ref={printRef}>
            {/* Yellow header band */}
            <div className="header flex items-start justify-between" style={{ background: '#FFB217', padding: '28px 36px 22px' }}>
              <div className="logo-wrap flex items-center gap-3">
                <div className="logo-circle flex items-center justify-center rounded-full text-sm font-black" style={{ width: 44, height: 44, background: '#AE1805', color: '#FFB217', flexShrink: 0 }}>CR</div>
                <div>
                  <p className="logo-text text-xl font-black" style={{ color: '#2A2522', letterSpacing: '-.5px' }}>CityRider</p>
                  <p className="logo-sub text-[9px] uppercase tracking-widest" style={{ color: '#2A2522', opacity: .6 }}>Logistics</p>
                </div>
              </div>
              <div className="slip-label text-right">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#2A2522' }}>Pay Slip</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#2A2522', opacity: .7 }}>{displayPeriod}</p>
                <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${entry.status === 'PAID' ? 'text-[#FFB217]' : 'text-[#2A2522]'}`}
                  style={{ background: entry.status === 'PAID' ? '#2A2522' : 'rgba(42,37,34,.15)' }}>
                  {entry.status === 'PAID' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 36px 28px' }}>
              {/* Employee info grid */}
              <div className="emp-grid grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl p-4" style={{ background: '#EFE7DC' }}>
                {([
                  ['Employee', entry.employeeName],
                  ['Department', entry.department],
                  ['Role', entry.role?.replace('_', ' ') ?? '—'],
                  ['Type', entry.employmentType === 'RIDER' ? 'Rider / Contract' : 'Staff'],
                  ['Bank', entry.bankName ?? '—'],
                  ['Account No.', entry.accountNumber ?? '—'],
                  entry.accountHolderName ? ['Account Name', entry.accountHolderName] : null,
                  entry.paidAt ? ['Payment Date', new Date(entry.paidAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })] : null,
                  entry.pensionPin ? ['Pension PIN', entry.pensionPin] : null,
                ] as Array<[string, string | number] | null>).filter((item): item is [string, string | number] => item !== null).map(([label, val]) => (
                  <div key={label as string} className="emp-item">
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B625A' }}>{label}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#2A2522' }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Earnings */}
              <div className="sec-head flex items-center gap-2 mt-5 mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#AE1805' }}>Earnings</p>
                <div className="flex-1 h-px" style={{ background: '#AE1805', opacity: .2 }} />
              </div>
              <div>
                {isStaff ? (
                  <>
                    <RowItem label="Basic Salary" value={fmt(entry.basicPay)} />
                    <RowItem label="Housing Allowance" value={fmt(entry.housingAllowance)} />
                    <RowItem label="Transport Allowance" value={fmt(entry.transportAllowance)} />
                  </>
                ) : (
                  <RowItem label={`${entry.deliveries} deliveries × ${fmt(entry.ratePerDelivery)}`} value={fmt(entry.basicPay)} />
                )}
                {(entry.bonus ?? 0) > 0 && <RowItem label="Performance Bonus" value={`+${fmt(entry.bonus)}`} valueColor="#1a7f43" />}
                {Array.isArray(entry.additions) && entry.additions.map((a: any, i: number) => (
                  <RowItem key={i} label={a.label || 'Addition'} value={`+${fmt(a.amount ?? 0)}`} valueColor="#1a7f43" />
                ))}
                <RowItem label="Gross Pay" value={fmt(entry.grossPay)} bold />
              </div>

              {/* Deductions */}
              <div className="sec-head flex items-center gap-2 mt-5 mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#AE1805' }}>Statutory Deductions</p>
                <div className="flex-1 h-px" style={{ background: '#AE1805', opacity: .2 }} />
              </div>
              <div>
                <RowItem label="PAYE (Income Tax)" value={`−${fmt(entry.taxPAYE)}`} valueColor="#AE1805" />
                <RowItem label="Pension — Employee 8%" value={`−${fmt(entry.pension)}`} valueColor="#AE1805" />
                <RowItem label="NHF — 2.5% of Basic" value={`−${fmt(entry.nhf)}`} valueColor="#AE1805" />
                <RowItem label="Total Deductions" value={`−${fmt(entry.taxPAYE + entry.pension + entry.nhf)}`} bold valueColor="#AE1805" />
              </div>

              {/* Net Pay band */}
              <div className="net-band flex items-center justify-between rounded-xl px-5 py-4 mt-5" style={{ background: '#2A2522' }}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#EFE7DC' }}>Net Pay</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#EFE7DC', opacity: .5 }}>After all statutory deductions</p>
                </div>
                <p className="text-2xl font-black tabular-nums" style={{ color: '#FFB217', letterSpacing: '-.5px' }}>{fmt(entry.netPay)}</p>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(42,37,34,.1)' }}>
                <p className="text-[9px] leading-relaxed" style={{ color: '#6B625A' }}>
                  CityRider Logistics Ltd<br />
                  12 Marina Street, Lagos Island, Lagos<br />
                  ops@cityrider.com
                </p>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: '#6B625A', opacity: .5 }}>
                  Computer Generated
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowItem({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(42,37,34,.07)' }}>
      <span className="text-xs" style={{ color: bold ? '#2A2522' : '#6B625A', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span className="text-xs tabular-nums" style={{ fontWeight: bold ? 700 : 600, color: valueColor ?? '#2A2522' }}>{value}</span>
    </div>
  );
}
