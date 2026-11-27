'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users01, Package, Phone, Mail01, MarkerPin01, Plus, Trash01, Edit02, CheckCircle, Star01 } from '@untitled-ui/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/auth-context';

interface Props {
  customerId: string;
  onClose: () => void;
}

const STATUS_CLS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-orange-100 text-orange-700',
  RESCHEDULED: 'bg-indigo-100 text-indigo-700',
};

const inp = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function fmt(n: number) { return `₦${n.toLocaleString()}`; }

interface PickupLocation {
  id: string;
  label: string;
  address: string;
  city: string;
  state?: string;
  instructions?: string;
  isDefault: boolean;
}

const EMPTY_LOC = { label: '', address: '', city: '', state: '', instructions: '', isDefault: false };

export function CustomerDetailDrawer({ customerId, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canViewStatement = ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT', 'CEO_EXECUTIVE'].includes(user?.role ?? '');
  const canAdjustAccount = ['ADMINISTRATOR', 'MANAGER', 'ACCOUNTANT'].includes(user?.role ?? '');
  const [adjustment, setAdjustment] = useState({ amount: '', reason: '' });
  const { data: statement } = useQuery({ queryKey: ['customer-statement', customerId], queryFn: () => api.get(`/invoices/customers/${customerId}/statement`).then((r) => r.data), enabled: !!customerId && canViewStatement });
  const adjustmentMut = useMutation({
    mutationFn: () => api.post(`/invoices/customers/${customerId}/adjustments`, { amount: Number(adjustment.amount), reason: adjustment.reason }).then((r) => r.data),
    onSuccess: () => { toast.success('Account adjustment recorded'); setAdjustment({ amount: '', reason: '' }); qc.invalidateQueries({ queryKey: ['customer-statement', customerId] }); },
    onError: () => toast.error('Could not record account adjustment'),
  });
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.get(`/customers/${customerId}`).then((r) => r.data),
  });

  const { data: pickupLocations = [] } = useQuery<PickupLocation[]>({
    queryKey: ['customer-pickup-locations', customerId],
    queryFn: () => api.get(`/customers/${customerId}/pickup-locations`).then((r) => r.data),
    enabled: !!customerId,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_LOC });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['customer-pickup-locations', customerId] });

  const createMut = useMutation({
    mutationFn: (data: typeof EMPTY_LOC) => api.post(`/customers/${customerId}/pickup-locations`, data).then((r) => r.data),
    onSuccess: () => { toast.success('Pickup location added'); setShowAddForm(false); setForm({ ...EMPTY_LOC }); invalidate(); },
    onError: () => toast.error('Failed to add location'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof EMPTY_LOC> }) =>
      api.patch(`/customers/${customerId}/pickup-locations/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success('Location updated'); setEditingId(null); setForm({ ...EMPTY_LOC }); invalidate(); },
    onError: () => toast.error('Failed to update location'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${customerId}/pickup-locations/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Location removed'); invalidate(); },
    onError: () => toast.error('Failed to remove location'),
  });

  function startEdit(loc: PickupLocation) {
    setEditingId(loc.id);
    setForm({ label: loc.label, address: loc.address, city: loc.city, state: loc.state ?? '', instructions: loc.instructions ?? '', isDefault: loc.isDefault });
    setShowAddForm(false);
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_LOC });
  }

  function LocationForm({ onSubmit, loading }: { onSubmit: () => void; loading: boolean }) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Label</label>
            <input placeholder="e.g. Head Office, Warehouse A" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Address</label>
            <input placeholder="Street address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inp} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">City</label>
            <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inp} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">State</label>
            <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium">Special instructions</label>
            <input placeholder="Gate code, landmark, etc." value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} className={inp} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
          Set as default pickup location
        </label>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={cancelForm} className="h-8 rounded-md border px-3 text-xs hover:bg-muted">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!form.label || !form.address || !form.city || loading}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Drawer title="Customer Details" onClose={onClose} width="lg">
      {isLoading && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>
      )}
      {customer && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {customer.name?.[0]?.toUpperCase() ?? <Users01 className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{customer.name}</h3>
              <p className="text-xs text-muted-foreground">Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Contact</p>
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail01 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.contactPerson && <p className="text-sm"><span className="text-muted-foreground">Contact person: </span>{customer.contactPerson}</p>}
            {customer.address && (
              <div className="flex items-start gap-2.5 text-sm">
                <MarkerPin01 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="text-muted-foreground">{customer.address}</span>
              </div>
            )}
            {customer.billingAddress && <p className="text-sm"><span className="text-muted-foreground">Billing address: </span>{customer.billingAddress}</p>}
          </div>

          {/* Quick stats */}
          {customer.stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-blue-600" />
                <p className="text-xl font-bold">{customer.stats.totalPackages ?? 0}</p>
                <p className="text-xs text-muted-foreground">Packages</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-green-600" />
                <p className="text-xl font-bold text-green-600">{customer.stats.delivered ?? 0}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                <p className="text-xl font-bold text-amber-600">{customer.stats.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          )}

          {/* Total spend */}
          {customer.stats?.totalSpend !== undefined && (
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Total spend (all time)</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{fmt(customer.stats.totalSpend)}</p>
            </div>
          )}

          {canViewStatement && <section className="space-y-3">
            <div className="flex items-baseline justify-between"><h4 className="text-sm font-semibold">Account statement</h4><span className="text-sm font-semibold">Balance: {fmt(Number(statement?.closingBalance ?? 0))}</span></div>
            {canAdjustAccount && <form className="grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); adjustmentMut.mutate(); }}>
              <input type="number" step="0.01" value={adjustment.amount} onChange={(e) => setAdjustment((v) => ({ ...v, amount: e.target.value }))} placeholder="+ debit / − credit" className={inp} aria-label="Adjustment amount" />
              <input value={adjustment.reason} onChange={(e) => setAdjustment((v) => ({ ...v, reason: e.target.value }))} placeholder="Reason for adjustment" className={inp} aria-label="Adjustment reason" />
              <button disabled={!adjustment.amount || !adjustment.reason.trim() || adjustmentMut.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">Record</button>
            </form>}
            <div className="max-h-52 overflow-auto rounded-lg border">
              {(statement?.rows ?? []).length === 0 ? <p className="p-3 text-xs text-muted-foreground">No account activity recorded.</p> : (statement.rows as any[]).slice(-12).reverse().map((row, index) => <div key={`${row.reference ?? row.type}-${index}`} className="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs last:border-0"><span className="min-w-0 truncate">{row.description}<span className="ml-2 text-muted-foreground">{new Date(row.date).toLocaleString()}</span></span><span className="shrink-0 font-medium">{fmt(Number(row.balance))}</span></div>)}
            </div>
          </section>}

          {/* Pickup Locations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Pickup Locations</p>
              {!showAddForm && editingId === null && (
                <button
                  onClick={() => { setShowAddForm(true); setForm({ ...EMPTY_LOC }); }}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>

            {showAddForm && (
              <LocationForm onSubmit={() => createMut.mutate(form)} loading={createMut.isPending} />
            )}

            {pickupLocations.length === 0 && !showAddForm && (
              <p className="text-xs text-muted-foreground py-2">No pickup locations saved. Click Add to register one.</p>
            )}

            <div className="space-y-2">
              {pickupLocations.map((loc) => (
                <div key={loc.id}>
                  {editingId === loc.id ? (
                    <LocationForm onSubmit={() => updateMut.mutate({ id: loc.id, data: form })} loading={updateMut.isPending} />
                  ) : (
                    <div className="flex items-start justify-between rounded-lg border bg-card px-3 py-2.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{loc.label}</p>
                          {loc.isDefault && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              <Star01 className="h-2.5 w-2.5" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{loc.address}, {loc.city}{loc.state ? `, ${loc.state}` : ''}</p>
                        {loc.instructions && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{loc.instructions}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => startEdit(loc)}
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Edit02 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMut.mutate(loc.id)}
                          disabled={deleteMut.isPending}
                          className="rounded p-1 hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash01 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent packages */}
          {customer.recentPackages?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Recent Packages</p>
              <div className="space-y-2">
                {customer.recentPackages.slice(0, 6).map((pkg: any) => (
                  <div key={pkg.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
                    <div>
                      <p className="text-sm font-mono font-medium">{pkg.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.recipient?.name ?? '—'} · {new Date(pkg.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[pkg.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {pkg.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
