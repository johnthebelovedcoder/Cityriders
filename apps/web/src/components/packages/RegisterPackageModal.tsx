'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Truck01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { CustomerPhoneInput, type ExistingCustomer } from './CustomerPhoneInput';
import { Drawer } from '@/components/ui/Drawer';

const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const numInp = `${inp} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
const textarea = 'flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type Props = { onClose: () => void };

export function RegisterPackageModal({ onClose }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ExistingCustomer | null>(null);
  const [riderId, setRiderId] = useState('');

  const { data: activeRiders } = useQuery({
    queryKey: ['riders-active'],
    queryFn: () => api.get('/riders/active').then((r) => r.data),
  });

  const [senderLookup, setSenderLookup] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientCity, setRecipientCity] = useState('');
  const [recipientNotes, setRecipientNotes] = useState('');

  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [promisedDelivery, setPromisedDelivery] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  function handleCustomerSelect(c: ExistingCustomer) {
    setSelectedCustomer(c);
    setSenderPhone(c.phone);
    setSenderName(c.name);
    if (c.address) {
      const parts = c.address.split(',');
      setSenderAddress(parts[0]?.trim() ?? c.address);
      setSenderCity(parts[1]?.trim() ?? '');
    }
  }

  function handlePhoneChange(phone: string) {
    setSenderPhone(phone);
    if (selectedCustomer && phone !== selectedCustomer.phone) setSelectedCustomer(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!senderPhone.trim()) { toast.error('Sender phone is required'); return; }
    if (!senderName.trim()) { toast.error('Sender name is required'); return; }
    setLoading(true);
    try {
      let senderId: string;
      if (selectedCustomer) {
        senderId = selectedCustomer.id;
      } else {
        const customersRes = await api.get('/customers', { params: { search: senderPhone } });
        const list = Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data?.data ?? []);
        const existing = list.find((c: any) => c.phone === senderPhone);
        if (existing) {
          senderId = existing.id;
        } else {
          const { data: newCustomer } = await api.post('/customers', {
            name: senderName, phone: senderPhone, address: `${senderAddress}, ${senderCity}`,
          });
          senderId = newCustomer.id;
        }
      }

      const { data: recipient } = await api.post('/recipients', {
        name: recipientName, phone: recipientPhone,
        deliveryAddress: `${recipientAddress}, ${recipientCity}`,
        deliveryNotes: recipientNotes || undefined,
      });

      const { data: pkg } = await api.post('/packages', {
        description: description || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : undefined,
        promisedDelivery: promisedDelivery || undefined,
        specialInstructions: specialInstructions || undefined,
        senderId, recipientId: recipient.id,
        originAddress: { street: senderAddress, city: senderCity, country: 'Nigeria' },
        destinationAddress: { street: recipientAddress, city: recipientCity, country: 'Nigeria' },
      });

      if (riderId) {
        try {
          await api.post(`/packages/${pkg.id}/assign`, { riderId });
        } catch { /* non-critical — package is created, assignment can be retried */ }
      }

      let notifNote = '';
      try {
        const trackingUrl = `${window.location.origin}/track/${pkg.trackingNumber}`;
        const { data: notif } = await api.post('/notifications/package-registered', {
          recipientName, recipientPhone, trackingNumber: pkg.trackingNumber, trackingUrl,
        });
        if (notif?.smsSent && notif?.emailSent) notifNote = ' - SMS & email sent';
        else if (notif?.smsSent) notifNote = ' - SMS sent';
        else if (notif?.emailSent) notifNote = ' - Email sent';
      } catch { /* non-critical */ }

      toast.success(`Package registered: ${pkg.trackingNumber}${notifNote}`);
      qc.invalidateQueries({ queryKey: ['packages'] });
      onClose();
      router.push(`/packages?detail=${pkg.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to register package');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer
      title="Register New Package"
      width="2xl"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            type="submit"
            form="register-package-form"
            disabled={loading}
            className="inline-flex h-11 items-center rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Registering...' : 'Register Package'}
          </button>
        </div>
      }
    >
      <form id="register-package-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Sender */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sender / Customer</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide">Find Existing Customer <span className="font-normal normal-case opacity-60">(search by name or phone)</span></label>
              <CustomerPhoneInput
                value={senderLookup}
                onChange={setSenderLookup}
                onSelect={(c) => { handleCustomerSelect(c); setSenderLookup(''); }}
                className={inp}
                placeholder="Search by name or phone..."
              />
            </div>
            {selectedCustomer && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                <span className="font-medium text-green-700">{selectedCustomer.name}</span>
                <span className="text-xs text-green-600">{selectedCustomer.phone}</span>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="ml-auto text-xs text-muted-foreground hover:underline">Clear</button>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Phone *</label>
              <CustomerPhoneInput
                value={senderPhone}
                onChange={handlePhoneChange}
                onSelect={handleCustomerSelect}
                className={inp}
                placeholder="+234..."
                required
              />
            </div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Name *</label><input required value={senderName} onChange={(e) => setSenderName(e.target.value)} className={inp} placeholder="Full name" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Pick-up Street *</label><input required value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} className={inp} placeholder="Street address" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">City *</label><input required value={senderCity} onChange={(e) => setSenderCity(e.target.value)} className={inp} placeholder="Lagos" /></div>
          </div>
        </div>

        <hr />

        {/* Recipient */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recipient</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Name *</label><input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inp} placeholder="Full name" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Phone *</label><input type="tel" required value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className={inp} placeholder="+234..." /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Delivery Street *</label><input required value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className={inp} placeholder="Street address" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">City *</label><input required value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} className={inp} placeholder="Lagos" /></div>
            <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Delivery Notes</label><textarea rows={2} value={recipientNotes} onChange={(e) => setRecipientNotes(e.target.value)} className={textarea} placeholder="Gate code, landmark, etc." /></div>
          </div>
        </div>

        <hr />

        {/* Package Details */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Package Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="What is in the parcel?" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Weight (kg)</label><input type="number" inputMode="decimal" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className={numInp} placeholder="0.0" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Delivery Fee (NGN)</label><input type="number" inputMode="decimal" step="0.01" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={numInp} placeholder="0.00" /></div>
            <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Promise Date <span className="font-normal normal-case opacity-60">(SLA)</span></label><input type="date" value={promisedDelivery} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setPromisedDelivery(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5 sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wide">Special Instructions</label><textarea rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} className={textarea} placeholder="Handle with care, fragile, etc." /></div>
          </div>
        </div>

        <hr />

        {/* Rider Assignment */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Truck01 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assign Rider <span className="font-normal normal-case opacity-60">(optional)</span></h3>
          </div>
          <select
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            className={inp}
            disabled={!activeRiders}
          >
            <option value="">Skip — assign later</option>
            {(activeRiders ?? []).map((rider: any) => (
              <option key={rider.id} value={rider.id}>
                {rider.user.firstName} {rider.user.lastName} · {rider.vehicleType ?? 'Rider'} · {rider.user.phone}
              </option>
            ))}
          </select>
          {!riderId && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              You can assign a rider later by opening the package and clicking <strong>Assign Rider</strong>.
            </p>
          )}
        </div>
      </form>
    </Drawer>
  );
}