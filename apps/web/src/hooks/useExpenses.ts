import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ExpenseFilters {
  category?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => api.get('/expenses', { params: { ...filters, limit: 25 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useCreateExpense(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/expenses', data),
    onSuccess: () => {
      toast.success('Expense recorded');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to record expense'),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/expenses/${id}/approve`),
    onSuccess: () => {
      toast.success('Expense approved');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast.error('Approval failed'),
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/expenses/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Expense rejected');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast.error('Rejection failed'),
  });
}
