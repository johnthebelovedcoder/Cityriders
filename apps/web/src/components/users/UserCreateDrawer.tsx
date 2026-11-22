'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Drawer } from '@/components/ui/Drawer';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const ROLES = ['ADMINISTRATOR', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT', 'RIDER'];

interface Props { onClose: () => void }

export function UserCreateDrawer({ onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'DISPATCHER' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create user'),
  });

  const fields = [
    { key: 'firstName', label: 'First Name *', type: 'text' },
    { key: 'lastName', label: 'Last Name *', type: 'text' },
    { key: 'email', label: 'Email *', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'password', label: 'Password *', type: 'password' },
  ] as const;

  const valid = form.firstName && form.lastName && form.email && form.password;

  return (
    <Drawer
      title="New Staff User"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating…' : 'Create User'}
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, type }) => (
          <div key={key} className={`space-y-1 ${key === 'email' || key === 'password' ? 'sm:col-span-2' : ''}`}>
            <label className="text-sm font-medium">{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        ))}

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Role *</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </Drawer>
  );
}

