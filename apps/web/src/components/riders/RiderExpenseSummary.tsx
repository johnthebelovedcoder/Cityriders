'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const fmt = (n: number | string) => `₦${Number(n).toLocaleString()}`;

export function RiderExpenseSummary({ riderId }: { riderId: string }) {
  const { data } = useQuery({
    queryKey: ['rider-expenses', riderId],
    queryFn: () => api.get(`/riders/${riderId}/expense-summary`).then(r => r.data),
  });

  if (!data || (data.breakdown?.length === 0)) return null;

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold mb-4">Expense Attribution</h2>
      <div className="space-y-3">
        {(data.breakdown ?? []).map((row: any) => (
          <div key={row.category} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{row.category.replace('_', ' ')}</span>
            <span className="font-mono font-semibold">{fmt(row.total)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">{fmt(data.total ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

