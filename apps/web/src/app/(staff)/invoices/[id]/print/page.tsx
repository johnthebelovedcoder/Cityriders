'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const B = {
  yellow: '#FFB217', red: '#AE1805', cream: '#EFE7DC',
  ink: '#2A2522', grey: '#6B625A', hair: '#D8CFC4',
};

type Props = { isReceipt?: boolean };

function CRLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size * 2.6} height={size} viewBox="0 0 112 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill={B.red} />
      <text x="22" y="28" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="17" letterSpacing="-0.5">CR</text>
      <text x="50" y="17" fill="#000" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="13" letterSpacing="-0.3">CITY RIDERS</text>
      <text x="50" y="31" fill={B.grey} fontFamily="Inter, sans-serif" fontWeight="400" fontSize="8" letterSpacing="0.2">LOGISTICS</text>
      <text x="50" y="41" fill={B.grey} fontFamily="Inter, sans-serif" fontWeight="400" fontSize="6.5" letterSpacing="0.1" fontStyle="italic">...Time is money, We save you both</text>
    </svg>
  );
}

function fmt(n: number) { return `₦${Number(n).toLocaleString('en-NG')}`; }
function fmtDate(d: string) { return new Date(d).toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' }); }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID:     { bg: '#dcfce7', text: '#166534' },
  OVERDUE:  { bg: '#fee2e2', text: '#991b1b' },
  SENT:     { bg: '#dbeafe', text: '#1e40af' },
  DRAFT:    { bg: '#f3f4f6', text: '#374151' },
  VOID:     { bg: '#f3f4f6', text: '#6b7280' },
  DISPUTED: { bg: '#fef3c7', text: '#92400e' },
};

export default function InvoicePrintPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const isReceipt = sp?.receipt === '1';

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice-detail', id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
  });

  if (isLoading) return <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', color:B.grey }}>Loading…</div>;
  if (!inv) return <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', color:B.grey }}>Invoice not found</div>;

  const sc = STATUS_COLOR[inv.status] ?? STATUS_COLOR.DRAFT!;
  const docTitle = isReceipt ? 'Receipt' : 'Invoice';
  const now = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Screen toolbar */}
      <div className="print:hidden" style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', background:'white', borderBottom:`1px solid ${B.hair}`, boxShadow:'0 1px 4px rgba(0,0,0,.08)', fontFamily:'Inter,sans-serif' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <CRLogo size={28} />
          <span style={{ fontWeight:600, fontSize:14, color:B.ink }}>{docTitle} — {inv.invoiceNumber}</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => window.history.back()} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${B.hair}`, background:'white', cursor:'pointer', fontSize:13, color:B.ink }}>← Back</button>
          <button onClick={() => window.print()} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:B.red, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>Print / Save PDF</button>
        </div>
      </div>

      <div style={{ minHeight:'100vh', background:'#f9f7f5', paddingTop:72, fontFamily:'Inter,sans-serif' }} className="print:pt-0 print:bg-white">
        <div style={{ maxWidth:720, margin:'0 auto', padding:'24px 32px 48px' }} className="print:max-w-none print:p-6">

          {/* Yellow header */}
          <div style={{ background:B.yellow, borderRadius:'12px 12px 0 0', padding:'22px 32px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <CRLogo size={44} />
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28, fontWeight:800, color:B.ink, letterSpacing:-1 }}>{docTitle.toUpperCase()}</div>
              <div style={{ fontSize:13, fontWeight:600, color:B.red, marginTop:2 }}>{inv.invoiceNumber}</div>
              <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', background:sc.bg, color:sc.text, borderRadius:99, padding:'3px 12px', fontSize:11, fontWeight:700, letterSpacing:.5 }}>
                {inv.status}
              </div>
            </div>
          </div>

          {/* Red contact strip */}
          <div style={{ background:B.red, padding:'8px 32px', display:'flex', gap:24, flexWrap:'wrap' }}>
            {['12 Marina Street, Lagos Island', '+234 704 380 1540', 'cityriderslogistics@gmail.com'].map((t) => (
              <span key={t} style={{ color:'white', fontSize:11, fontWeight:500 }}>{t}</span>
            ))}
          </div>

          <div style={{ background:'white', border:`1px solid ${B.hair}`, borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden' }}>

            {/* Billed to / Invoice details */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:`1px solid ${B.hair}` }}>
              <div style={{ padding:'20px 32px', borderRight:`1px solid ${B.hair}` }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:8 }}>Billed To</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.ink }}>{inv.customer?.name}</div>
                {inv.customer?.address && <div style={{ fontSize:12, color:B.grey, marginTop:4 }}>{inv.customer.address}</div>}
                {inv.customer?.phone && <div style={{ fontSize:12, color:B.grey, marginTop:2 }}>{inv.customer.phone}</div>}
                {inv.customer?.email && <div style={{ fontSize:12, color:B.grey, marginTop:2 }}>{inv.customer.email}</div>}
              </div>
              <div style={{ padding:'20px 32px' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:8 }}>Details</div>
                {[
                  { label:'Issue Date', value: fmtDate(inv.createdAt) },
                  { label:'Due Date',   value: fmtDate(inv.dueDate) },
                  ...(inv.paidAt ? [{ label:'Paid On', value: fmtDate(inv.paidAt) }] : []),
                  { label:'Printed',   value: now },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:B.grey }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:B.ink }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Line items table */}
            <div style={{ padding:'0 32px' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:0 }}>
                <thead>
                  <tr style={{ background:B.cream }}>
                    {['#', 'Description', 'Tracking', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding:'10px 12px', fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:B.grey, textAlign: i > 2 ? 'right' : 'left', borderBottom:`1px solid ${B.hair}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(inv.lineItems ?? []).map((li: any, idx: number) => (
                    <tr key={li.id} style={{ borderBottom:`1px solid ${B.hair}` }}>
                      <td style={{ padding:'10px 12px', fontSize:11, color:B.grey }}>{idx + 1}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:B.ink, fontWeight:500 }}>{li.description}</td>
                      <td style={{ padding:'10px 12px', fontSize:11, color:B.grey, fontFamily:'monospace' }}>{li.trackingNumber ?? '—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:B.ink, textAlign:'right' }}>{li.quantity}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, color:B.ink, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt(li.unitPrice)}</td>
                      <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:B.ink, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmt(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display:'flex', justifyContent:'flex-end', borderTop:`1px solid ${B.hair}` }}>
              <div style={{ width:280, padding:'16px 32px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:B.grey }}>Subtotal</span>
                  <span style={{ fontSize:13, color:B.ink, fontVariantNumeric:'tabular-nums' }}>{fmt(inv.subtotal ?? inv.totalAmount)}</span>
                </div>
                {inv.vatAmount > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:B.grey }}>VAT ({(inv.vatRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontSize:13, color:B.ink, fontVariantNumeric:'tabular-nums' }}>{fmt(inv.vatAmount)}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', background:B.yellow, margin:'8px -8px -8px', padding:'10px 8px', borderRadius:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:B.ink }}>Total Due</span>
                  <span style={{ fontSize:16, fontWeight:800, color:B.red, fontVariantNumeric:'tabular-nums' }}>{fmt(inv.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Bank details (not shown on receipt) */}
            {!isReceipt && inv.bankName && (
              <div style={{ padding:'20px 32px', borderTop:`1px solid ${B.hair}`, background:B.cream }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:8 }}>Payment Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
                  {[
                    { label:'Bank', value: inv.bankName },
                    { label:'Account Number', value: inv.accountNumber },
                    { label:'Account Name', value: inv.accountName },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize:10, color:B.grey }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:B.ink, fontVariantNumeric:'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt stamp (shown on receipt) */}
            {isReceipt && inv.status === 'PAID' && (
              <div style={{ padding:'20px 32px', borderTop:`1px solid ${B.hair}`, display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ border:`3px solid #16a34a`, color:'#16a34a', borderRadius:8, padding:'8px 20px', fontSize:16, fontWeight:800, letterSpacing:2, textTransform:'uppercase', transform:'rotate(-3deg)', flexShrink:0 }}>
                  PAID IN FULL
                </div>
                <div style={{ fontSize:12, color:B.grey }}>Payment of {fmt(inv.paidAmount ?? inv.totalAmount)} received{inv.paidAt ? ` on ${fmtDate(inv.paidAt)}` : ''}. This receipt is proof of payment.</div>
              </div>
            )}

            {/* Notes */}
            {inv.notes && (
              <div style={{ padding:'14px 32px', borderTop:`1px solid ${B.hair}`, background:'#fffdf9' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:4 }}>Notes</div>
                <div style={{ fontSize:12, color:B.grey }}>{inv.notes}</div>
              </div>
            )}

            {/* Footer band */}
            <div style={{ background:B.yellow, padding:'10px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:B.ink, opacity:.7, fontStyle:'italic' }}>...Time is money, We save you both</span>
              <span style={{ fontSize:10, color:B.ink, opacity:.7 }}>cityriderslogistics@gmail.com · +234 704 380 1540</span>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:10, color:B.grey, marginTop:12 }}>City Riders Logistics · 12 Marina Street, Lagos Island · Registered in Nigeria</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Inter, sans-serif; }
        }
      `}</style>
    </>
  );
}
