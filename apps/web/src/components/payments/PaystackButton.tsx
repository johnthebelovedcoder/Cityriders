'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

interface Props {
  email: string;
  amountNgn: number;
  packageId?: string;
  customerId?: string;
  onSuccess?: (reference: string) => void;
  label?: string;
}

declare global {
  interface Window {
    PaystackPop?: { setup: (opts: object) => { openIframe: () => void } };
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function PaystackButton({ email, amountNgn, packageId, customerId, onSuccess, label = 'Pay Online' }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { data } = await api.post('/paystack/initialize', { email, amount: amountNgn, packageId, customerId });
      await loadPaystackScript();

      window.PaystackPop!.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '',
        email,
        amount: amountNgn * 100,
        ref: data.reference,
        onSuccess: async (transaction: { reference: string }) => {
          try {
            await api.get(`/paystack/verify/${transaction.reference}`);
            toast.success('Payment verified successfully');
            onSuccess?.(transaction.reference);
          } catch {
            toast.error('Payment verification failed');
          }
        },
        onCancel: () => toast.info('Payment cancelled'),
      }).openIframe();
    } catch {
      toast.error('Could not initialize payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
    >
      <CreditCard01 className="h-3.5 w-3.5" />
      {loading ? 'Loading…' : label}
    </button>
  );
}

