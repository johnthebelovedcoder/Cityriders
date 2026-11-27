'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus01, Edit01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { SelectField } from '@/components/ui/SelectField';

const ROLE_BADGE: Record<string, string> = {
  ADMINISTRATOR: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-violet-100 text-violet-700',
  DISPATCHER: 'bg-blue-100 text-blue-700',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-700',
  CUSTOMER_SERVICE: 'bg-orange-100 text-orange-700',
  CEO_EXECUTIVE: 'bg-rose-100 text-rose-700',
  RIDER: 'bg-green-100 text-green-700',
  CUSTOMER: 'bg-sky-100 text-sky-700',
};

const ROLES = ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT', 'CUSTOMER_SERVICE', 'CEO_EXECUTIVE', 'RIDER', 'CUSTOMER'];

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrator — full access',
  MANAGER: 'Manager — operations & reporting',
  DISPATCHER: 'Dispatcher — packages & assignments',
  ACCOUNTANT: 'Accountant — finance & invoices',
  CUSTOMER_SERVICE: 'Customer Service — escalations',
  CEO_EXECUTIVE: 'Executive — view-only overview',
  RIDER: 'Rider — mobile delivery app only',
  CUSTOMER: 'Customer — linked business portal',
};

export function UsersSettings() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'DISPATCHER', customerId: '' });

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers').then((r) => r.data) });
  const { data: coverage = [] } = useQuery({ queryKey: ['customer-service-coverage'], queryFn: () => api.get('/customer-service/coverage').then((r) => r.data) });
  const [coverageStaffId, setCoverageStaffId] = useState('');
  const [coverageCustomerId, setCoverageCustomerId] = useState('');
  const assignCoverage = useMutation({
    mutationFn: () => api.post('/customer-service/coverage', { staffUserId: coverageStaffId, customerId: coverageCustomerId }),
    onSuccess: () => { toast.success('Customer assigned'); qc.invalidateQueries({ queryKey: ['customer-service-coverage'] }); },
    onError: () => toast.error('Could not assign customer'),
  });
  const removeCoverage = useMutation({
    mutationFn: ({ staffUserId, customerId }: { staffUserId: string; customerId: string }) => api.delete(`/customer-service/coverage/${staffUserId}/${customerId}`),
    onSuccess: () => { toast.success('Customer assignment removed'); qc.invalidateQueries({ queryKey: ['customer-service-coverage'] }); },
    onError: () => toast.error('Could not remove assignment'),
  });

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setForm({ firstName: '', lastName: '', email: '', password: '', role: 'DISPATCHER', customerId: '' }); },
    onError: () => toast.error('Failed to create user'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}`, { status: 'INACTIVE' }),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const [editUser, setEditUser] = useState<{ id: string; firstName: string; lastName: string; role: string; customerId: string | null } | null>(null);

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }: { id: string; firstName: string; lastName: string; role: string; customerId: string | null }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); },
    onError: () => toast.error('Failed to update user'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Create, edit and deactivate staff accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus01 className="h-3.5 w-3.5" /> Add User
        </button>
      </div>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <h3 className="font-semibold">Customer Service Coverage</h3>
          <p className="text-sm text-muted-foreground">Customer Service staff can access packages and cases only for assigned customer accounts.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectField aria-label="Customer Service staff" value={coverageStaffId} onChange={setCoverageStaffId} className="flex-1" placeholder="Select Customer Service staff" options={(users ?? []).filter((user: any) => user.role === 'CUSTOMER_SERVICE').map((user: any) => ({ value: user.id, label: `${user.firstName} ${user.lastName} · ${user.email}` }))} />
          <SelectField aria-label="Customer account" value={coverageCustomerId} onChange={setCoverageCustomerId} className="flex-1" placeholder="Select customer account" options={(Array.isArray(customers) ? customers : customers?.data ?? []).map((customer: any) => ({ value: customer.id, label: customer.name }))} />
          <button disabled={!coverageStaffId || !coverageCustomerId || assignCoverage.isPending} onClick={() => assignCoverage.mutate()} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">Assign</button>
        </div>
        <div className="divide-y rounded-md border">
          {coverage.length === 0 && <p className="p-3 text-sm text-muted-foreground">No customer coverage assignments yet.</p>}
          {coverage.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <span><strong>{item.staffUser.firstName} {item.staffUser.lastName}</strong><span className="text-muted-foreground"> · {item.customer.name}</span></span>
            <button onClick={() => removeCoverage.mutate({ staffUserId: item.staffUser.id, customerId: item.customer.id })} className="text-xs font-medium text-destructive hover:underline">Remove</button>
          </div>)}
        </div>
      </section>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left">{['Name', 'Email', 'Role', 'Status', 'Last login', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading...</td></tr>}
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? ''}`}>{u.role}</span></td>
                <td className="px-4 py-3"><span className={`text-xs font-medium ${u.status === 'ACTIVE' ? 'text-green-600' : u.status === 'PENDING' ? 'text-amber-600' : 'text-red-500'}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditUser({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role, customerId: u.customerId ?? null })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Edit01 className="h-3 w-3" /> Edit</button>
                    {u.status === 'ACTIVE' && <button onClick={() => deactivate.mutate(u.id)} className="text-xs text-destructive hover:underline">Deactivate</button>}
                    {u.status === 'PENDING' && <span className="text-xs text-muted-foreground" title="Email delivery is not configured">Invite email unavailable</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditUser(null)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Edit User</h3>
            <div className="space-y-3">
              {(['firstName', 'lastName'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{key === 'firstName' ? 'First name' : 'Last name'}</label>
                  <input value={editUser[key]} onChange={(e) => setEditUser((u) => u ? { ...u, [key]: e.target.value } : u)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <SelectField value={editUser.role} onChange={(role) => setEditUser((user) => user ? { ...user, role, customerId: role === 'CUSTOMER' ? user.customerId : null } : user)} options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role }))} aria-label="User role" />
              </div>
              {editUser.role === 'CUSTOMER' && <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Customer account</label><SelectField value={editUser.customerId ?? ''} onChange={(customerId) => setEditUser((user) => user ? { ...user, customerId: customerId || null } : user)} placeholder="Select customer" options={(Array.isArray(customers) ? customers : customers?.data ?? []).map((customer: any) => ({ value: customer.id, label: customer.name }))} aria-label="Customer account" /></div>}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setEditUser(null)} className="flex-1 rounded-md border py-2 text-sm hover:bg-muted">Cancel</button>
              <button disabled={!editUser.firstName || updateUser.isPending} onClick={() => updateUser.mutate(editUser)} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{updateUser.isPending ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold">Create User Account</h3>
            <p className="mb-4 text-xs text-muted-foreground">Set a temporary password and share it through your approved secure channel.</p>
            <div className="space-y-3">
              {(['firstName', 'lastName', 'email'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {key === 'firstName' ? 'First name' : key === 'lastName' ? 'Last name' : 'Email'}
                  </label>
                  <input placeholder={key === 'firstName' ? 'e.g. Amaka' : key === 'lastName' ? 'e.g. Okafor' : 'e.g. amaka@company.com'} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ))}
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Temporary password</label><input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <SelectField value={form.role} onChange={(role) => setForm((current) => ({ ...current, role, customerId: '' }))} options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] ?? role }))} aria-label="New user role" />
              </div>
              {form.role === 'CUSTOMER' && <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Customer account</label><SelectField value={form.customerId} onChange={(customerId) => setForm((current) => ({ ...current, customerId }))} placeholder="Select customer" options={(Array.isArray(customers) ? customers : customers?.data ?? []).map((customer: any) => ({ value: customer.id, label: customer.name }))} aria-label="Customer account" /></div>}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-md border py-2 text-sm hover:bg-muted">Cancel</button>
              <button disabled={!form.firstName || !form.email || !form.password || (form.role === 'CUSTOMER' && !form.customerId) || createUser.isPending} onClick={() => createUser.mutate()} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{createUser.isPending ? 'Creating…' : 'Create account'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

