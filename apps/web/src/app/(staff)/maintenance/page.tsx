'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit02, Trash01, AlertTriangle, CheckCircle, Tool02, Car01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SelectField } from '@/components/ui/SelectField';

const MAINTENANCE_TYPES = ['Oil Change', 'Tire Replacement', 'Brake Service', 'Battery Replacement', 'Engine Repair', 'Transmission', 'Air Filter', 'Inspection', 'Insurance Renewal', 'Other'];
const STATUS_OPTIONS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const inp = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const fmt = (n: any) => n ? `₦${Number(n).toLocaleString()}` : '—';

const EMPTY = { vehicleId: '', type: 'Oil Change', component: '', replacementDate: '', description: '', cost: '', mileageAtService: '', serviceDate: new Date().toISOString(), nextServiceDate: '', nextServiceMileage: '', performedBy: '', status: 'COMPLETED', notes: '' };

type MaintenanceRecord = {
  id: string; type: string; component?: string; replacementDate?: string; description?: string; cost?: number; mileageAtService?: number;
  serviceDate: string; nextServiceDate?: string; nextServiceMileage?: number;
  performedBy?: string; status: string; notes?: string; vehicleId: string;
  repeatMaintenance?: boolean;
  vehicle?: { id: string; plateNumber: string; make: string; model: string };
};

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenance', vehicleFilter],
    queryFn: () => api.get('/maintenance', { params: vehicleFilter ? { vehicleId: vehicleFilter } : undefined }).then((r) => r.data),
  });

  const { data: alerts = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenance/alerts'],
    queryFn: () => api.get('/maintenance/alerts').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles-list'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/maintenance', data),
    onSuccess: () => { toast.success('Record added'); qc.invalidateQueries({ queryKey: ['maintenance'] }); setShowCreate(false); setForm({ ...EMPTY }); },
    onError: () => toast.error('Failed to add record'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => api.patch(`/maintenance/${id}`, data),
    onSuccess: () => { toast.success('Record updated'); qc.invalidateQueries({ queryKey: ['maintenance'] }); setEditRecord(null); },
    onError: () => toast.error('Failed to update record'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/${id}`),
    onSuccess: () => { toast.success('Record removed'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: () => toast.error('Failed to remove record'),
  });

  function openEdit(r: MaintenanceRecord) {
    setEditRecord(r);
    setForm({
      vehicleId: r.vehicleId,
      type: r.type,
      component: r.component ?? '',
      replacementDate: r.replacementDate ?? '',
      description: r.description ?? '',
      cost: r.cost ? String(r.cost) : '',
      mileageAtService: r.mileageAtService ? String(r.mileageAtService) : '',
      serviceDate: r.serviceDate,
      nextServiceDate: r.nextServiceDate ?? '',
      nextServiceMileage: r.nextServiceMileage ? String(r.nextServiceMileage) : '',
      performedBy: r.performedBy ?? '',
      status: r.status,
      notes: r.notes ?? '',
    });
  }

  const stats = {
    total: records.length,
    completed: records.filter((r) => r.status === 'COMPLETED').length,
    scheduled: records.filter((r) => r.status === 'SCHEDULED').length,
    overdue: alerts.filter((r) => r.nextServiceDate && new Date(r.nextServiceDate) < new Date()).length,
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide">Vehicle *</label>
          <SelectField value={form.vehicleId} onChange={(value) => set('vehicleId', value)} placeholder="Select vehicle" aria-label="Vehicle" options={(vehicles as any[]).map((v: any) => ({ value: v.id, label: `${v.plateNumber} — ${v.make} ${v.model}` }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Type *</label>
          <SelectField value={form.type} onChange={(value) => set('type', value)} aria-label="Maintenance type" options={MAINTENANCE_TYPES.map((type) => ({ value: type, label: type }))} />
        </div>
        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Component / Part</label><input value={form.component} onChange={(e) => set('component', e.target.value)} className={inp} placeholder="e.g. front tyre, battery" /></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Replacement date and time</label><DateTimePicker value={form.replacementDate} onChange={(value) => set('replacementDate', value)} aria-label="Replacement date and time" /></div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Status</label>
          <SelectField value={form.status} onChange={(value) => set('status', value)} aria-label="Maintenance status" options={STATUS_OPTIONS.map((status) => ({ value: status, label: status.replaceAll('_', ' ') }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Service date and time *</label>
          <DateTimePicker value={form.serviceDate} onChange={(value) => set('serviceDate', value)} aria-label="Service date and time" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Cost (₦)</label>
          <input type="number" value={form.cost} onChange={(e) => set('cost', e.target.value)} className={inp} placeholder="0" min={0} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Odometer at Service (km)</label>
          <input type="number" value={form.mileageAtService} onChange={(e) => set('mileageAtService', e.target.value)} className={inp} placeholder="km" min={0} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Performed By</label>
          <input value={form.performedBy} onChange={(e) => set('performedBy', e.target.value)} className={inp} placeholder="Mechanic name" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Next service date and time</label>
          <DateTimePicker value={form.nextServiceDate} onChange={(value) => set('nextServiceDate', value)} aria-label="Next service date and time" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide">Next Service Odometer (km)</label>
          <input type="number" value={form.nextServiceMileage} onChange={(e) => set('nextServiceMileage', e.target.value)} className={inp} placeholder="km" min={0} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Details about the service…" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Internal notes…" />
      </div>
    </div>
  );

  const canSubmit = form.vehicleId && form.type && form.serviceDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Track vehicle service history and upcoming maintenance</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...EMPTY }); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Log Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Records', value: stats.total, icon: Tool02, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Scheduled', value: stats.scheduled, icon: Car01, cls: 'text-indigo-600 bg-indigo-50' },
          { label: 'Overdue / Due Soon', value: alerts.length, icon: AlertTriangle, cls: alerts.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50' },
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Maintenance Due / Repeat Repair Review</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alerts.map((a) => {
                  const overdue = a.nextServiceDate && new Date(a.nextServiceDate) < new Date();
                  return (
                    <div key={a.id} className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${overdue ? 'border-red-300 bg-white text-red-700' : 'border-amber-300 bg-white text-amber-700'}`}>
                      <span className="font-mono">{a.vehicle?.plateNumber}</span>
                      <span className="mx-1">·</span>
                      {a.type}
                      <span className="ml-1 opacity-70">{overdue ? '⚠ Overdue' : a.nextServiceDate ? `Due ${new Date(a.nextServiceDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                      {a.repeatMaintenance && <span className="ml-1 text-red-700">Repeated component repair — review</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <SelectField className="min-w-48" value={vehicleFilter} onChange={setVehicleFilter} aria-label="Filter by vehicle" options={[{ value: '', label: 'All Vehicles' }, ...(vehicles as any[]).map((v: any) => ({ value: v.id, label: `${v.plateNumber} — ${v.make} ${v.model}` }))]} />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && records.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No maintenance records found.</p>
        )}
        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {['Vehicle', 'Type', 'Date', 'Cost', 'Odometer', 'Next Service', 'By', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => {
                  const nextOverdue = r.nextServiceDate && new Date(r.nextServiceDate) < new Date();
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-semibold">{r.vehicle?.plateNumber ?? '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.type}</p>
                        {r.description && <p className="text-xs text-muted-foreground truncate max-w-32">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.serviceDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 tabular-nums">{r.cost ? fmt(r.cost) : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.mileageAtService ? `${Number(r.mileageAtService).toLocaleString()} km` : '—'}</td>
                      <td className="px-4 py-3">
                        {r.nextServiceDate ? (
                          <span className={nextOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                            {new Date(r.nextServiceDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {nextOverdue && ' ⚠'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.performedBy ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Edit02 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (window.confirm(`Delete this maintenance record?`)) remove.mutate(r.id); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
        <Drawer title="Log Maintenance" onClose={() => setShowCreate(false)} footer={
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
            <button disabled={!canSubmit || create.isPending} onClick={() => create.mutate(form)} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {create.isPending ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        }>
          <FormFields />
        </Drawer>
      )}

      {/* Edit Drawer */}
      {editRecord && (
        <Drawer title="Edit Maintenance Record" onClose={() => setEditRecord(null)} footer={
          <div className="flex gap-3">
            <button onClick={() => setEditRecord(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
            <button disabled={!canSubmit || update.isPending} onClick={() => update.mutate({ id: editRecord.id, data: form })} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
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
