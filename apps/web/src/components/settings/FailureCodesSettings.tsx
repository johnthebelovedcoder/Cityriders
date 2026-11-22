'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit01, CheckCircle, XCircle } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

type FailureCode = { id: string; code: string; label: string; description?: string; isActive: boolean };

const inp = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const EMPTY = { code: '', label: '', description: '' };

export function FailureCodesSettings() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', description: '' });

  const { data: codes = [], isLoading } = useQuery<FailureCode[]>({
    queryKey: ['failure-reason-codes'],
    queryFn: () => api.get('/settings/failure-reason-codes').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/settings/failure-reason-codes', data),
    onSuccess: () => { toast.success('Code created'); qc.invalidateQueries({ queryKey: ['failure-reason-codes'] }); setForm(EMPTY); setShowAdd(false); },
    onError: () => toast.error('Failed to create code'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: string; label: string; description: string }) =>
      api.patch(`/settings/failure-reason-codes/${id}`, data),
    onSuccess: () => { toast.success('Code updated'); qc.invalidateQueries({ queryKey: ['failure-reason-codes'] }); setEditId(null); },
    onError: () => toast.error('Failed to update code'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/settings/failure-reason-codes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['failure-reason-codes'] }),
    onError: () => toast.error('Failed to update'),
  });

  const canCreate = form.code.trim() && form.label.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Failure Reason Codes</h2>
          <p className="text-sm text-muted-foreground">Codes riders select when recording a failed delivery attempt</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add Code
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold">New Failure Code</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                placeholder="e.g. WRONG_ADDRESS"
                className={inp}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Label *</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Wrong address"
                className={inp}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional longer description"
                className={inp}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setForm(EMPTY); }} className="inline-flex h-8 items-center rounded-md border px-3 text-xs hover:bg-muted">Cancel</button>
            <button
              disabled={!canCreate || create.isPending}
              onClick={() => create.mutate(form)}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && codes.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No failure reason codes yet. Add one above.</p>
        )}
        {codes.map((code) => (
          <div key={code.id} className={`flex items-start gap-3 border-b last:border-0 px-4 py-3 ${!code.isActive ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              {editId === code.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.label}
                    onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                    className={inp}
                    placeholder="Label"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className={inp}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => update.mutate({ id: code.id, ...editForm })}
                      disabled={update.isPending}
                      className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >Save</button>
                    <button onClick={() => setEditId(null)} className="inline-flex h-7 items-center rounded-md border px-3 text-xs hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{code.code}</span>
                    {!code.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">Inactive</span>}
                  </div>
                  <p className="text-sm font-medium">{code.label}</p>
                  {code.description && <p className="text-xs text-muted-foreground">{code.description}</p>}
                </>
              )}
            </div>
            {editId !== code.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditId(code.id); setEditForm({ label: code.label, description: code.description ?? '' }); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Edit"
                >
                  <Edit01 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggle.mutate({ id: code.id, isActive: !code.isActive })}
                  className={`rounded-md p-1.5 ${code.isActive ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  title={code.isActive ? 'Deactivate' : 'Activate'}
                >
                  {code.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Inactive codes are hidden from riders but kept for historical data. The rider app also includes a set of built-in codes.
      </p>
    </div>
  );
}
