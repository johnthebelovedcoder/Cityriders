'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users01, CheckCircle, XCircle, Truck01, Edit02, Trash01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { Drawer } from '@/components/ui/Drawer';
import { PeriodFilter, usePeriodFilter } from '@/components/ui/PeriodFilter';
import { CODHandoverModal } from '@/components/riders/CODHandoverModal';
import { MetricCard } from '@/components/ui/MetricCard';
import { RiderDetailDrawer } from '@/components/riders/RiderDetailDrawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

const inp = 'flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function RidersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [handoverRider, setHandoverRider] = useState<{ id: string; name: string } | null>(null);
  const [detailRiderId, setDetailRiderId] = useState<string | null>(null);
  const { range, setRange } = usePeriodFilter('this-month');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', vehicleType: '', vehiclePlate: '', emergencyContact: '', dateJoined: new Date().toISOString() });

  const [editRider, setEditRider] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('');
  const [editVehiclePlate, setEditVehiclePlate] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editDateJoined, setEditDateJoined] = useState('');

  const { data: riderStats } = useQuery({
    queryKey: ['riders-stats', range.from, range.to],
    queryFn: () => api.get('/riders/stats', { params: { from: range.from, to: range.to } }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: riders, isLoading } = useQuery({
    queryKey: ['riders', search, range.from, range.to],
    queryFn: () => api.get('/riders', { params: { search: search || undefined, from: range.from, to: range.to } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/riders', { ...form, password: form.password || Math.random().toString(36).slice(2, 10) }),
    onSuccess: () => {
      toast.success('Rider created');
      qc.invalidateQueries({ queryKey: ['riders'] });
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', vehicleType: '', vehiclePlate: '', emergencyContact: '', dateJoined: new Date().toISOString() });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create rider'),
  });

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/riders/${editRider?.id}`, {
      firstName: editFirstName || undefined,
      lastName: editLastName || undefined,
      email: editEmail || undefined,
      phone: editPhone || undefined,
      vehicleType: editVehicleType || undefined,
      vehiclePlate: editVehiclePlate || undefined,
      emergencyContact: editEmergencyContact || undefined,
      dateJoined: editDateJoined || undefined,
    }),
    onSuccess: () => {
      toast.success('Rider updated');
      qc.invalidateQueries({ queryKey: ['riders'] });
      qc.invalidateQueries({ queryKey: ['rider', editRider?.id] });
      setEditRider(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update rider'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/riders/${id}`),
    onSuccess: () => {
      toast.success('Rider deactivated');
      qc.invalidateQueries({ queryKey: ['riders'] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to deactivate rider'),
  });

  function openEdit(r: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditRider(r);
    setEditFirstName(r.user.firstName ?? '');
    setEditLastName(r.user.lastName ?? '');
    setEditEmail(r.user.email ?? '');
    setEditPhone(r.user.phone ?? '');
    setEditVehicleType(r.vehicleType ?? '');
    setEditVehiclePlate(r.vehiclePlate ?? '');
    setEditEmergencyContact(r.emergencyContact ?? '');
    setEditDateJoined(r.dateJoined ?? '');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">Manage delivery rider profiles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + Add Rider
        </button>
      </div>

      {/* Period filter + Stats */}
      <div className="flex items-center gap-3">
        <PeriodFilter value={range} onChange={setRange} defaultPreset="this-month" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Riders"
          value={riderStats?.total ?? '-'}
          sub="Registered riders"
          icon={Users01}
          iconCls="text-foreground bg-muted"
        />
        <MetricCard
          label="Active"
          value={riderStats?.active ?? '-'}
          sub="Available to deliver"
          icon={CheckCircle}
          iconCls="text-green-600 bg-green-50"
          valueColor="text-green-600"
        />
        <MetricCard
          label="On Delivery"
          value={riderStats?.onDelivery ?? '-'}
          sub="Currently en route"
          icon={Truck01}
          iconCls="text-amber-600 bg-amber-50"
          valueColor="text-amber-600"
        />
        <MetricCard
          label="Off Duty"
          value={(riderStats?.total ?? 0) - (riderStats?.active ?? 0) - (riderStats?.onDelivery ?? 0)}
          sub="Inactive / unavailable"
          icon={XCircle}
          iconCls="text-gray-500 bg-gray-50"
          valueColor="text-gray-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Plate</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
            {!isLoading && (!riders?.length) && (
              <tr><td colSpan={7} className="py-2">
                <EmptyState title="No riders yet" description="Add your first rider to start assigning deliveries." />
              </td></tr>
            )}
            {riders?.map((r: any) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.user.firstName} {r.user.lastName}</td>
                <td className="px-4 py-3">{r.user.phone ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{r.vehicleType ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.vehiclePlate ?? '-'}</td>
                <td className="px-4 py-3">
                  {r.zone ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{r.zone.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetailRiderId(r.id)} className="inline-flex h-8 items-center rounded-md px-2 text-xs text-primary hover:underline">View</button>
                    {r.status === 'ACTIVE' && (
                      <button
                        onClick={() => setHandoverRider({ id: r.id, name: `${r.user.firstName} ${r.user.lastName}` })}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs text-green-600 hover:underline"
                      >
                        Hand Over Cash
                      </button>
                    )}
                    <button onClick={(e) => openEdit(r, e)} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                      <Edit02 className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === r.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}
                          className="rounded px-2 py-0.5 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60">Confirm</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(r.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Deactivate rider">
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

      {handoverRider && (
        <CODHandoverModal
          riderId={handoverRider.id}
          riderName={handoverRider.name}
          onClose={() => setHandoverRider(null)}
        />
      )}

      {detailRiderId && (
        <RiderDetailDrawer riderId={detailRiderId} onClose={() => setDetailRiderId(null)} />
      )}

      {editRider && (
        <Drawer
          title="Edit Rider"
          onClose={() => setEditRider(null)}
          footer={
            <div className="flex gap-3">
              <button onClick={() => setEditRider(null)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={editMutation.isPending}
                onClick={() => editMutation.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">First Name</label>
              <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className={inp} placeholder="First name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Last Name</label>
              <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className={inp} placeholder="Last name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Email</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inp} placeholder="Email address" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Phone</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inp} placeholder="+234..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Vehicle Type</label>
              <input value={editVehicleType} onChange={(e) => setEditVehicleType(e.target.value)} className={inp} placeholder="e.g. Motorcycle" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide">Plate Number</label>
              <input value={editVehiclePlate} onChange={(e) => setEditVehiclePlate(e.target.value)} className={inp} placeholder="e.g. LAG-123AB" />
            </div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Emergency Contact</label><input value={editEmergencyContact} onChange={(e) => setEditEmergencyContact(e.target.value)} className={inp} placeholder="Name and phone" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wide">Date joined</label><DateTimePicker value={editDateJoined} onChange={setEditDateJoined} aria-label="Rider join date and time" /></div>
          </div>
        </Drawer>
      )}

      {showCreate && (
        <Drawer
          title="New Rider"
          onClose={() => setShowCreate(false)}
          footer={
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={!form.firstName || !form.lastName || !form.email || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Saving...' : 'Create'}
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'First Name *', key: 'firstName', required: true },
              { label: 'Last Name *', key: 'lastName', required: true },
              { label: 'Email *', key: 'email', type: 'email', required: true },
              { label: 'Phone', key: 'phone', type: 'tel' },
              { label: 'Vehicle Type', key: 'vehicleType' },
              { label: 'Plate Number', key: 'vehiclePlate' },
              { label: 'Emergency Contact', key: 'emergencyContact' },
              { label: 'Date Joined', key: 'dateJoined' },
            ].map(({ label, key, type, required }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide">{label}</label>
                {key === 'dateJoined' ? <DateTimePicker value={(form as any)[key]} onChange={(value) => setForm((f) => ({ ...f, [key]: value }))} aria-label="Rider join date and time" /> : <input type={type ?? 'text'} required={required} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inp} />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Password will be auto-generated if left blank. Share it with the rider.</p>
        </Drawer>
      )}
    </div>
  );
}
