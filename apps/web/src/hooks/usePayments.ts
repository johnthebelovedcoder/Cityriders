import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface PaymentFilters {
  type?: string;
  status?: string;
  method?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => api.get('/payments', { params: { ...filters, limit: 25 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useCreatePayment(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) => api.post('/payments', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['payments'] });
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to record payment'),
  });
}

export function useRunSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/payments/settle', {}),
    onSuccess: () => {
      toast.success('Pending payments settled');
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: () => toast.error('Settlement failed'),
  });
}
