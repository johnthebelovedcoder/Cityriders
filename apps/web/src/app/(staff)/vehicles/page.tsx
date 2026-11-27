'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit02, Trash01, Car01, AlertTriangle, CheckCircle, XCircle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SelectField } from '@/components/ui/SelectField';

const VEHICLE_TYPES = ['Motorcycle', 'Tricycle', 'Car', 'Van', 'Truck', 'Bicycle', 'Other'];
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};

const inp = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const EMPTY = { plateNumber: '', make: '', model: '', year: new Date().getFullYear(), type: 'Motorcycle', status: 'ACTIVE', assignedRiderId: '', insuranceExpiry: '', inspectionExpiry: '', odometerKm: 0, notes: '' };

type Vehicle = { id: string; plateNumber: string; make: string; model: string; year: number; type: string; status: string; odometerKm: number; insuranceExpiry?: string; inspectionExpiry?: string; notes?: string; assignedRider?: { id: string; user: { firstName: string; lastName: string } } };

export default function VehiclesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', search],
    queryFn: () => api.get('/vehicles', { params: search ? { search } : undefined }).then((r) => r.data),
  });

  const { data: riders = [] } = useQuery<any[]>({
    queryKey: ['riders-list'],
    queryFn: () => api.get('/riders').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/vehicles', data),
    onSuccess: () => { toast.success('Vehicle added'); qc.invalidateQueries({ queryKey: ['vehicles'] }); setShowCreate(false); setForm({ ...EMPTY }); },
    onError: () => toast.error('Failed to add vehicle'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => api.patch(`/vehicles/${id}`, data),
    onSuccess: () => { toast.success('Vehicle updated'); qc.invalidateQueries({ queryKey: ['vehicles'] }); setEditVehicle(null); },
    onError: () => toast.error('Failed to update vehicle'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => { toast.success('Vehicle removed'); qc.invalidateQueries({ queryKey: ['vehicles'] }); },
    onError: () => toast.error('Failed to remove vehicle'),
  });

  function openEdit(v: Vehicle) {
    setEditVehicle(v);
    setForm({
      plateNumber: v.plateNumber,
      make: v.make,
      model: v.model,
      year: v.year,
      type: v.type,
      status: v.status,
      assignedRiderId: v.assignedRider?.id ?? '',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '',
      inspectionExpiry: v.inspectionExpiry ? v.inspectionExpiry.slice(0, 10) : '',
      odometerKm: v.odometerKm,
      notes: v.notes ?? '',
    });
  }

  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'ACTIVE').length,
    maintenance: vehicles.filter((v) => v.status === 'MAINTENANCE').length,
    inactive: vehicles.filter((v) => v.status === 'INACTIVE').length,
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Plate Number *</label>
          <input value={form.plateNumber} onChange={(e) => set('plateNumber', e.target.value.toUpperCase())} className={inp} placeholder="e.g. LAG-123-ABC" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Type *</label>
          <SelectField value={form.type} onChange={(value) => set('type', value)} aria-label="Vehicle type" options={VEHICLE_TYPES.map((type) => ({ value: type, label: type }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Make *</label>
          <input value={form.make} onChange={(e) => set('make', e.target.value)} className={inp} placeholder="e.g. Honda" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Model *</label>
          <input value={form.model} onChange={(e) => set('model', e.target.value)} className={inp} placeholder="e.g. CG125" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Year *</label>
          <input type="number" value={form.year} onChange={(e) => set('year', parseInt(e.target.value))} className={inp} min={2000} max={2030} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Status</label>
          <SelectField value={form.status} onChange={(value) => set('status', value)} aria-label="Vehicle status" options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Assign to Rider</label>
          <SelectField value={form.assignedRiderId} onChange={(value) => set('assignedRiderId', value)} aria-label="Assigned rider" placeholder="Unassigned" options={(riders as any[]).map((r: any) => ({ value: r.id, label: `${r.user.firstName} ${r.user.lastName}` }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Odometer (km)</label>
          <input type="number" value={form.odometerKm} onChange={(e) => set('odometerKm', parseFloat(e.target.value))} className={inp} min={0} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Insurance Expiry</label>
          <DateTimePicker mode="date" value={form.insuranceExpiry} onChange={(value) => set('insuranceExpiry', value)} aria-label="Insurance expiry date" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Inspection Expiry</label>
          <DateTimePicker mode="date" value={form.inspectionExpiry} onChange={(value) => set('inspectionExpiry', value)} aria-label="Inspection expiry date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Optional notes…" />
      </div>
    </div>
  );

  const canSubmit = form.plateNumber.trim() && form.make.trim() && form.model.trim() && form.year;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-sm text-muted-foreground">Manage the fleet's motorcycles, vehicles, and equipment</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...EMPTY }); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: Car01, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Active', value: stats.active, icon: CheckCircle, cls: 'text-green-600 bg-green-50' },
          { label: 'In Maintenance', value: stats.maintenance, icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, cls: 'text-gray-500 bg-gray-50' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by plate, make or model…" className="flex h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && vehicles.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No vehicles found. Add one above.</p>
        )}
        {vehicles.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {['Plate', 'Type / Make / Model', 'Year', 'Status', 'Rider', 'Odometer', 'Insurance', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {vehicles.map((v) => {
                  const insExpired = v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date();
                  return (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-semibold">{v.plateNumber}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{v.type}</span>
                        <p className="font-medium">{v.make} {v.model}</p>
                      </td>
                      <td className="px-4 py-3">{v.year}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {v.assignedRider ? `${v.assignedRider.user.firstName} ${v.assignedRider.user.lastName}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">{v.odometerKm.toLocaleString()} km</td>
                      <td className="px-4 py-3">
                        {v.insuranceExpiry ? (
                          <span className={insExpired ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                            {new Date(v.insuranceExpiry).toLocaleString()}
                            {insExpired && ' ⚠'}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(v)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Edit02 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (window.confirm(`Remove vehicle ${v.plateNumber}?`)) remove.mutate(v.id); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash01 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Drawer */}
      {showCreate && (
        <Drawer title="Add Vehicle" onClose={() => setShowCreate(false)} footer={
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
            <button disabled={!canSubmit || create.isPending} onClick={() => create.mutate(form)} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {create.isPending ? 'Saving…' : 'Add Vehicle'}
            </button>
          </div>
        }>
          <FormFields />
        </Drawer>
      )}

      {/* Edit Drawer */}
      {editVehicle && (
        <Drawer title={`Edit — ${editVehicle.plateNumber}`} onClose={() => setEditVehicle(null)} footer={
          <div className="flex gap-3">
            <button onClick={() => setEditVehicle(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
            <button disabled={!canSubmit || update.isPending} onClick={() => update.mutate({ id: editVehicle.id, data: form })} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }>
          <FormFields />
        </Drawer>
      )}
    </div>
  );
}
