'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function ExpenseCategoriesSettings() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expense-category-settings'],
    queryFn: () => api.get('/settings/expense-categories').then((response) => response.data as any[]),
  });
  const update = useMutation({
    mutationFn: ({ code, label, isActive }: { code: string; label: string; isActive: boolean }) => api.patch(`/settings/expense-categories/${code}`, { label, isActive }),
    onSuccess: () => {
      toast.success('Expense category saved');
      queryClient.invalidateQueries({ queryKey: ['expense-category-settings'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: () => toast.error('Could not save expense category'),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading categories…</p>;
  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Expense categories</h2>
        <p className="text-sm text-muted-foreground">Rename categories or turn them on and off. Historical expenses retain their saved category.</p>
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {categories.map((category: any) => (
          <CategoryRow key={category.code} category={category} isPending={update.isPending} onSave={(label, isActive) => update.mutate({ code: category.code, label, isActive })} />
        ))}
      </div>
    </section>
  );
}

function CategoryRow({ category, isPending, onSave }: { category: any; isPending: boolean; onSave: (label: string, active: boolean) => void }) {
  const [label, setLabel] = useState(category.label);
  useEffect(() => setLabel(category.label), [category.label]);
  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <code className="w-36 text-xs text-muted-foreground">{category.code}</code>
      <input aria-label={`${category.code} display name`} value={label} onChange={(event) => setLabel(event.target.value)} className="h-9 min-w-48 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
      <button type="button" disabled={isPending || !label.trim()} onClick={() => onSave(label.trim(), !category.isActive)} className="h-9 rounded-md border px-3 text-xs font-medium disabled:opacity-50">{category.isActive ? 'Deactivate' : 'Activate'}</button>
      <button type="button" disabled={isPending || !label.trim()} onClick={() => onSave(label.trim(), category.isActive)} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">Save name</button>
    </div>
  );
}
