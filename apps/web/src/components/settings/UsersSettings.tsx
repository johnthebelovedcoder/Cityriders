'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus01, Edit01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

const ROLE_BADGE: Record<string, string> = {
  ADMINISTRATOR: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-violet-100 text-violet-700',
  DISPATCHER: 'bg-blue-100 text-blue-700',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-700',
  CUSTOMER_SERVICE: 'bg-orange-100 text-orange-700',
  CEO_EXECUTIVE: 'bg-rose-100 text-rose-700',
  RIDER: 'bg-green-100 text-green-700',
};

const ROLES = ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT', 'CUSTOMER_SERVICE', 'CEO_EXECUTIVE', 'RIDER'];

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrator — full access',
  MANAGER: 'Manager — operations & reporting',
  DISPATCHER: 'Dispatcher — packages & assignments',
  ACCOUNTANT: 'Accountant — finance & invoices',
  CUSTOMER_SERVICE: 'Customer Service — escalations',
  CEO_EXECUTIVE: 'Executive — view-only overview',
  RIDER: 'Rider — mobile delivery app only',
};

export function UsersSettings() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'DISPATCHER' });

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data) });

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); setForm({ firstName: '', lastName: '', email: '', role: 'DISPATCHER' }); },
    onError: () => toast.error('Failed to create user'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}`, { status: 'INACTIVE' }),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const [editUser, setEditUser] = useState<{ id: string; firstName: string; lastName: string; role: string } | null>(null);

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }: { id: string; firstName: string; lastName: string; role: string }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); },
    onError: () => toast.error('Failed to update user'),
  });

  const resendInvite = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/resend-invite`),
    onSuccess: () => toast.success('Invite resent'),
    onError: () => toast.error('Failed to resend invite'),
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
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditUser({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Edit01 className="h-3 w-3" /> Edit</button>
                    {u.status === 'ACTIVE' && <button onClick={() => deactivate.mutate(u.id)} className="text-xs text-destructive hover:underline">Deactivate</button>}
                    {u.status === 'PENDING' && <button onClick={() => resendInvite.mutate(u.id)} disabled={resendInvite.isPending} className="text-xs text-blue-600 hover:underline disabled:opacity-50">Resend invite</button>}
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
                <select value={editUser.role} onChange={(e) => setEditUser((u) => u ? { ...u, role: e.target.value } : u)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                </select>
              </div>
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
            <h3 className="mb-1 text-lg font-semibold">Invite Staff Member</h3>
            <p className="mb-4 text-xs text-muted-foreground">An invitation email with a password-setup link will be sent to the address below.</p>
            <div className="space-y-3">
              {(['firstName', 'lastName', 'email'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {key === 'firstName' ? 'First name' : key === 'lastName' ? 'Last name' : 'Work email'}
                  </label>
                  <input placeholder={key === 'firstName' ? 'e.g. Amaka' : key === 'lastName' ? 'e.g. Okafor' : 'e.g. amaka@company.com'} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-md border py-2 text-sm hover:bg-muted">Cancel</button>
              <button disabled={!form.firstName || !form.email || createUser.isPending} onClick={() => createUser.mutate()} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{createUser.isPending ? 'Sending invite…' : 'Send invite'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

