'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users01, Package, TrendUp01, Edit02, Trash01, AlertOctagon, CurrencyDollar } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { MetricCard } from '@/components/ui/MetricCard';
import { Drawer } from '@/components/ui/Drawer';
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/SelectField';

const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pricingCustomer, setPricingCustomer] = useState<any | null>(null);
  const [pricingForm, setPricingForm] = useState({ baseRateFlat: '', baseRatePerKg: '', discountPercent: '', notes: '' });
  const { range, setRange } = usePeriodFilter('this-month');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editBillingAddress, setEditBillingAddress] = useState('');
  const [editBillingCycle, setEditBillingCycle] = useState('MONTHLY');

  const { data: stats } = useQuery({
    queryKey: ['customers-stats', range.from, range.to],
    queryFn: () => api.get('/customers/stats', { params: { from: range.from, to: range.to } }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search, range.from, range.to],
    queryFn: () => api.get('/customers', { params: { search: search || undefined, from: range.from, to: range.to } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/customers', { name, phone, email: email || undefined, address: address || undefined, contactPerson: contactPerson || undefined, billingAddress: billingAddress || undefined, billingCycle }),
    onSuccess: () => {
      toast.success('Customer created');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowCreate(false);
      setName(''); setPhone(''); setEmail(''); setAddress(''); setContactPerson(''); setBillingAddress(''); setBillingCycle('MONTHLY');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create customer'),
  });

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/customers/${editCustomer?.id}`, {
      name: editName || undefined,
      phone: editPhone || undefined,
      email: editEmail || undefined,
      address: editAddress || undefined,
      contactPerson: editContactPerson || undefined,
      billingAddress: editBillingAddress || undefined,
      billingCycle: editBillingCycle || undefined,
    }),
    onSuccess: () => {
      toast.success('Customer updated');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', editCustomer?.id] });
      setEditCustomer(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update customer'),
  });

  const { data: existingPricing } = useQuery({
    queryKey: ['customer-pricing', pricingCustomer?.id],
    queryFn: () => api.get(`/customers/${pricingCustomer!.id}/pricing`).then((r) => r.data).catch(() => null),
    enabled: !!pricingCustomer,
    staleTime: 0,
  });

  useEffect(() => {
    if (existingPricing) {
      setPricingForm({
        baseRateFlat: existingPricing.baseRateFlat != null ? String(existingPricing.baseRateFlat) : '',
        baseRatePerKg: existingPricing.baseRatePerKg != null ? String(existingPricing.baseRatePerKg) : '',
        discountPercent: existingPricing.discountPercent != null ? String(existingPricing.discountPercent) : '',
        notes: existingPricing.notes ?? '',
      });
    }
  }, [existingPricing]);

  const upsertPricing = useMutation({
    mutationFn: () => api.put(`/customers/${pricingCustomer!.id}/pricing`, {
      baseRateFlat: pricingForm.baseRateFlat ? parseFloat(pricingForm.baseRateFlat) : null,
      baseRatePerKg: pricingForm.baseRatePerKg ? parseFloat(pricingForm.baseRatePerKg) : null,
      discountPercent: pricingForm.discountPercent ? parseFloat(pricingForm.discountPercent) : null,
      notes: pricingForm.notes || null,
    }),
    onSuccess: () => { toast.success('Pricing override saved'); setPricingCustomer(null); },
    onError: () => toast.error('Failed to save pricing'),
  });

  const deletePricing = useMutation({
    mutationFn: () => api.delete(`/customers/${pricingCustomer!.id}/pricing`),
    onSuccess: () => { toast.success('Pricing override removed'); setPricingCustomer(null); },
    onError: () => toast.error('Failed to remove pricing'),
  });

  function openPricing(c: any, e: React.MouseEvent) {
    e.stopPropagation();
    setPricingCustomer(c);
    setPricingForm({ baseRateFlat: '', baseRatePerKg: '', discountPercent: '', notes: '' });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success('Customer archived');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete customer'),
  });

  function openEdit(c: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditCustomer(c);
    setEditName(c.name ?? '');
    setEditPhone(c.phone ?? '');
    setEditEmail(c.email ?? '');
    setEditAddress(c.address ?? '');
    setEditContactPerson(c.contactPerson ?? '');
    setEditBillingAddress(c.billingAddress ?? '');
    setEditBillingCycle(c.billingCycle ?? 'MONTHLY');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage sender and customer records</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + Add Customer
        </button>
      </div>

      <div className="flex items-center gap-3">
        <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Customers" value={stats?.total ?? '-'} sub="All registered senders" icon={Users01} iconCls="text-foreground bg-muted" />
        <MetricCard label="With Packages" value={stats?.withPackages ?? '-'} sub="Have active shipments" icon={Package} iconCls="text-blue-600 bg-blue-50" valueColor="text-blue-600" />
        <MetricCard label="New This Month" value={stats?.newThisMonth ?? '-'} sub="Joined recently" icon={TrendUp01} iconCls="text-green-600 bg-green-50" valueColor="text-green-600" />
        <MetricCard label="No Shipments" value={(stats?.total ?? 0) - (stats?.withPackages ?? 0)} sub="Never shipped" icon={AlertOctagon} iconCls="text-gray-500 bg-gray-50" valueColor="text-gray-500" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">CLV</th>
              <th className="px-4 py-3 font-medium">Shipments</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && (!customers?.length) && (
              <tr><td colSpan={7} className="py-2">
                <EmptyState title="No customers yet" description="Customers are created when you register a package or add one manually." />
              </td></tr>
            )}
            {customers?.map((c: any) => (
              <tr key={c.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/30" onClick={() => setDetailCustomerId(c.id)}>
                <td className="px-4 py-3 font-medium text-primary">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.address ?? '-'}</td>
                <td className="px-4 py-3 font-mono font-semibold">{c.clv != null ? `₦${Number(c.clv).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.shipmentCount ?? '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEdit(c, e)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Edit"
                    >
                      <Edit02 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => openPricing(c, e)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Pricing Override"
                    >
                      <CurrencyDollar className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(c.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded px-2 py-0.5 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                        >
                          Confirm
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)} className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        title="Archive customer"
                      >
                        <Trash01 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create drawer */}
      {showCreate && (
        <Drawer
          title="New Customer"
          onClose={() => setShowCreate(false)}
          footer={
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={!name || !phone || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Saving...' : 'Create'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Name *</label><input required value={name} onChange={(e) => setName(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Phone *</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Business Contact Person</label><input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Billing Address</label><input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Billing Cycle</label>
              <SelectField value={billingCycle} onChange={setBillingCycle} options={[{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'BI_WEEKLY', label: 'Bi-Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} aria-label="Billing cycle" />
            </div>
          </div>
        </Drawer>
      )}

      {/* Edit drawer */}
      {editCustomer && (
        <Drawer
          title="Edit Customer"
          onClose={() => setEditCustomer(null)}
          footer={
            <div className="flex gap-3">
              <button onClick={() => setEditCustomer(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={!editName || !editPhone || editMutation.isPending}
                onClick={() => editMutation.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Name *</label><input required value={editName} onChange={(e) => setEditName(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Phone *</label><input type="tel" required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Email</label><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Business Contact Person</label><input value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Address</label><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Billing Address</label><input value={editBillingAddress} onChange={(e) => setEditBillingAddress(e.target.value)} className={inp} /></div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Billing Cycle</label>
              <SelectField value={editBillingCycle} onChange={setEditBillingCycle} options={[{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'BI_WEEKLY', label: 'Bi-Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} aria-label="Billing cycle" />
            </div>
          </div>
        </Drawer>
      )}

      {detailCustomerId && (
        <CustomerDetailDrawer customerId={detailCustomerId} onClose={() => setDetailCustomerId(null)} />
      )}

      {/* Pricing Override Drawer */}
      {pricingCustomer && (
        <Drawer
          title={`Pricing Override — ${pricingCustomer.name}`}
          onClose={() => setPricingCustomer(null)}
          footer={
            <div className="flex gap-3">
              {existingPricing && (
                <button
                  onClick={() => { if (window.confirm('Remove pricing override?')) deletePricing.mutate(); }}
                  disabled={deletePricing.isPending}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Remove
                </button>
              )}
              <button onClick={() => setPricingCustomer(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={upsertPricing.isPending}
                onClick={() => upsertPricing.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {upsertPricing.isPending ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {existingPricing && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">Existing override</p>
                <p>Flat rate: {existingPricing.baseRateFlat ? `₦${Number(existingPricing.baseRateFlat).toLocaleString()}` : '—'}</p>
                <p>Per-kg rate: {existingPricing.baseRatePerKg ? `₦${Number(existingPricing.baseRatePerKg).toFixed(2)}/kg` : '—'}</p>
                <p>Discount: {existingPricing.discountPercent ? `${existingPricing.discountPercent}%` : '—'}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Leave a field blank to keep the system default for that rate. At least one field should be filled.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Flat Base Rate (₦)</label>
              <input type="number" value={pricingForm.baseRateFlat} onChange={(e) => setPricingForm((f) => ({ ...f, baseRateFlat: e.target.value }))} className={inp} placeholder="e.g. 500" min={0} step="0.01" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Rate Per Kg (₦/kg)</label>
              <input type="number" value={pricingForm.baseRatePerKg} onChange={(e) => setPricingForm((f) => ({ ...f, baseRatePerKg: e.target.value }))} className={inp} placeholder="e.g. 150.00" min={0} step="0.0001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Discount (%)</label>
              <input type="number" value={pricingForm.discountPercent} onChange={(e) => setPricingForm((f) => ({ ...f, discountPercent: e.target.value }))} className={inp} placeholder="e.g. 10" min={0} max={100} step="0.01" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Notes</label>
              <textarea value={pricingForm.notes} onChange={(e) => setPricingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Reason for custom pricing…" />
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
