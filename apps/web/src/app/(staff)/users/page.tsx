'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Mail01, Users01, CheckCircle, XCircle, Truck01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';
import { UserCreateDrawer } from '@/components/users/UserCreateDrawer';
import { MetricCard } from '@/components/ui/MetricCard';

const ROLES = ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT', 'RIDER'];
const STATUSES = ['ACTIVE', 'INACTIVE'];

const roleBadge: Record<string, string> = {
  ADMINISTRATOR: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-violet-100 text-violet-800',
  DISPATCHER: 'bg-blue-100 text-blue-800',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-800',
  RIDER: 'bg-amber-100 text-amber-800',
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Record<string, { role: string; status: string }>>({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: allUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const users = allUsers.filter((u: any) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const resendInvite = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/resend-invite`),
    onSuccess: () => toast.success('Invitation email resent'),
    onError: () => toast.error('Failed to resend invite'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...dto }: { id: string; role?: string; status?: string }) =>
      api.patch(`/users/${id}`, dto),
    onSuccess: (_, vars) => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing((e) => { const n = { ...e }; delete n[vars.id]; return n; });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  function startEdit(user: any) {
    setEditing((e) => ({ ...e, [user.id]: { role: user.role, status: user.status } }));
  }

  function cancelEdit(id: string) {
    setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
  }

  function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    updateMutation.mutate({ id, ...draft });
  }

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Users" value={allUsers.length} sub="All staff accounts" icon={Users01} iconCls="text-primary" />
        <MetricCard label="Active" value={allUsers.filter((u: any) => u.status === 'ACTIVE').length} sub="Currently active" icon={CheckCircle} iconCls="text-emerald-500" valueColor="text-emerald-600" />
        <MetricCard label="Inactive" value={allUsers.filter((u: any) => u.status === 'INACTIVE').length} sub="Deactivated accounts" icon={XCircle} iconCls="text-muted-foreground" />
        <MetricCard label="Riders" value={allUsers.filter((u: any) => u.role === 'RIDER').length} sub="Delivery staff" icon={Truck01} iconCls="text-amber-500" valueColor="text-amber-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="h-10 flex-1 min-w-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u: any) => {
              const draft = editing[u.id];
              return (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {draft ? (
                      <select
                        value={draft.role}
                        onChange={(e) => setEditing((ed) => ({ ...ed, [u.id]: { ...draft, role: e.target.value } }))}
                        className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[u.role] ?? 'bg-muted text-foreground'}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {draft ? (
                      <select
                        value={draft.status}
                        onChange={(e) => setEditing((ed) => ({ ...ed, [u.id]: { ...draft, status: e.target.value } }))}
                        className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[u.status] ?? 'bg-muted text-foreground'}`}>
                        {u.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {draft ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveEdit(u.id)}
                          disabled={updateMutation.isPending}
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => cancelEdit(u.id)}
                          className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => resendInvite.mutate(u.id)}
                          disabled={resendInvite.isPending}
                          title="Resend invitation email"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <Mail01 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => startEdit(u)}
                          className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No users found.</div>
        )}
      </div>

      {showCreate && <UserCreateDrawer onClose={() => setShowCreate(false)} />}
    </div>
  );
}

