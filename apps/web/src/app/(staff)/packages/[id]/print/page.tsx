'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ── Brand tokens ─────────────────────────────────────────── */
const B = {
  yellow: '#FFB217',
  red:    '#AE1805',
  cream:  '#EFE7DC',
  ink:    '#2A2522',
  grey:   '#6B625A',
  hair:   '#D8CFC4',
};

/* ── Inline SVG logo (CR monogram + wordmark) ─────────────── */
function CRLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size * 2.6} height={size} viewBox="0 0 112 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* monogram circle */}
      <circle cx="22" cy="22" r="22" fill={B.red} />
      <text x="22" y="28" textAnchor="middle" fill="white" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="17" letterSpacing="-0.5">CR</text>
      {/* wordmark */}
      <text x="50" y="17" fill="#000" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="13" letterSpacing="-0.3">CITY RIDERS</text>
      <text x="50" y="31" fill={B.grey} fontFamily="Inter, sans-serif" fontWeight="400" fontSize="8" letterSpacing="0.2">LOGISTICS</text>
      <text x="50" y="41" fill={B.grey} fontFamily="Inter, sans-serif" fontWeight="400" fontSize="6.5" letterSpacing="0.1" fontStyle="italic">...Time is money, We save you both</text>
    </svg>
  );
}

export default function WaybillPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package', id],
    queryFn: () => api.get(`/packages/${id}`).then((r) => r.data),
  });

  if (isLoading) return <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', color:B.grey }}>Loading waybill…</div>;
  if (!pkg) return <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', color:B.grey }}>Package not found</div>;

  const p = pkg as any;
  const now = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Screen toolbar ── */}
      <div className="print:hidden" style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 24px', background:'white', borderBottom:`1px solid ${B.hair}`, boxShadow:'0 1px 4px rgba(0,0,0,.08)',
        fontFamily:'Inter,sans-serif',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <CRLogo size={32} />
          <span style={{ fontWeight:600, fontSize:14, color:B.ink }}>Waybill — {p.trackingNumber}</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => window.history.back()} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${B.hair}`, background:'white', cursor:'pointer', fontSize:13, color:B.ink }}>← Back</button>
          <button onClick={() => window.print()} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:B.red, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>Print / Save PDF</button>
        </div>
      </div>

      {/* ── Waybill document ── */}
      <div style={{ minHeight:'100vh', background:'#f9f7f5', paddingTop:72, fontFamily:'Inter,sans-serif' }} className="print:pt-0 print:bg-white">
        <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 32px 48px' }} className="print:max-w-none print:p-6">

          {/* Yellow header band */}
          <div style={{ background:B.yellow, borderRadius:'12px 12px 0 0', padding:'20px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <CRLogo size={42} />
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.ink, opacity:.6 }}>Waybill</div>
              <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color:B.red, marginTop:2, letterSpacing:1 }}>{p.trackingNumber}</div>
              <div style={{ fontSize:10, color:B.ink, opacity:.6, marginTop:2 }}>Printed: {now}</div>
            </div>
          </div>

          {/* Contact strip */}
          <div style={{ background:B.red, padding:'8px 28px', display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              '12 Marina Street, Lagos Island',
              '+234 704 380 1540',
              'cityriderslogistics@gmail.com',
            ].map((t) => (
              <span key={t} style={{ color:'white', fontSize:11, fontWeight:500 }}>{t}</span>
            ))}
          </div>

          {/* Main card */}
          <div style={{ background:'white', borderRadius:'0 0 12px 12px', border:`1px solid ${B.hair}`, borderTop:'none', overflow:'hidden' }}>

            {/* Status + SLA */}
            <div style={{ padding:'16px 28px', borderBottom:`1px solid ${B.hair}`, display:'flex', alignItems:'center', gap:12, background:B.cream }}>
              <span style={{ background:B.yellow, color:B.ink, fontWeight:800, fontSize:11, letterSpacing:1.5, textTransform:'uppercase', padding:'4px 14px', borderRadius:99 }}>
                {p.status?.replace(/_/g, ' ')}
              </span>
              {p.promisedDelivery && (
                <span style={{ fontSize:12, color:B.grey }}>
                  SLA: {new Date(p.promisedDelivery).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short' })}
                </span>
              )}
            </div>

            {/* Sender / Recipient */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:`1px solid ${B.hair}` }}>
              <div style={{ padding:'20px 28px', borderRight:`1px solid ${B.hair}` }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:8 }}>From (Sender)</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.ink }}>{p.sender?.name ?? '—'}</div>
                <div style={{ fontSize:12, color:B.grey, marginTop:4 }}>{p.sender?.phone ?? ''}</div>
                {p.originStreet && <div style={{ fontSize:12, color:B.grey, marginTop:2 }}>{p.originStreet}{p.originCity ? `, ${p.originCity}` : ''}</div>}
              </div>
              <div style={{ padding:'20px 28px', background:'#fffdf9', position:'relative' }}>
                <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:B.red }} />
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:8 }}>To (Recipient)</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.ink }}>{p.recipient?.name ?? '—'}</div>
                <div style={{ fontSize:12, color:B.grey, marginTop:4 }}>{p.recipient?.phone ?? ''}</div>
                {(p.destStreet || p.recipient?.deliveryAddress) && (
                  <div style={{ fontSize:12, color:B.grey, marginTop:2 }}>
                    {p.destStreet ?? p.recipient?.deliveryAddress ?? ''}
                    {p.destCity ? `, ${p.destCity}` : ''}
                  </div>
                )}
                {p.recipient?.deliveryNotes && (
                  <div style={{ marginTop:8, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'6px 10px', fontSize:11, color:'#92400e' }}>
                    ⚠ {p.recipient.deliveryNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Package details row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:`1px solid ${B.hair}` }}>
              {[
                { label:'Description', value: p.description ?? '—' },
                { label:'Weight', value: p.weight ? `${p.weight} kg` : '—' },
                { label:'Delivery Fee', value: p.deliveryFee ? `₦${Number(p.deliveryFee).toLocaleString()}` : '—' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ padding:'16px 24px', borderRight: i < 2 ? `1px solid ${B.hair}` : 'none' }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:B.ink }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Special instructions */}
            {p.specialInstructions && (
              <div style={{ padding:'14px 28px', borderBottom:`1px solid ${B.hair}`, background:'#fffbeb', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:14 }}>📋</span>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#92400e', marginBottom:3 }}>Special Instructions</div>
                  <div style={{ fontSize:12, color:'#78350f' }}>{p.specialInstructions}</div>
                </div>
              </div>
            )}

            {/* Assigned rider */}
            {p.rider && (
              <div style={{ padding:'14px 28px', borderBottom:`1px solid ${B.hair}`, display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:B.yellow, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:B.ink, flexShrink:0 }}>
                  {(p.rider.user?.firstName?.[0] ?? '') + (p.rider.user?.lastName?.[0] ?? '')}
                </div>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:B.grey, marginBottom:2 }}>Assigned Rider</div>
                  <div style={{ fontSize:13, fontWeight:600, color:B.ink }}>{p.rider.user?.firstName} {p.rider.user?.lastName}</div>
                  <div style={{ fontSize:11, color:B.grey }}>{p.rider.user?.phone}{p.rider.vehiclePlate ? ` · ${p.rider.vehiclePlate}` : ''}</div>
                </div>
              </div>
            )}

            {/* Signature boxes */}
            <div style={{ padding:'24px 28px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
              {['Sender Signature', 'Rider Signature', 'Recipient Signature'].map((label) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ height:60, borderBottom:`2px solid ${B.ink}`, marginBottom:8 }} />
                  <div style={{ fontSize:10, color:B.grey, letterSpacing:.5 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Footer band */}
            <div style={{ background:B.yellow, padding:'10px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:B.ink, opacity:.7, fontStyle:'italic' }}>...Time is money, We save you both</span>
              <span style={{ fontSize:10, color:B.ink, opacity:.7 }}>Track: cityrider.com/track/{p.trackingNumber}</span>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:10, color:B.grey, marginTop:12 }}>This waybill is a legal transport document. City Riders Logistics · Registered in Nigeria</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media print {
          @page { size: A5; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Inter, sans-serif; }
        }
      `}</style>
    </>
  );
}
