'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck01 } from '@untitled-ui/icons-react';
import { api } from '@/lib/api';

export type ExistingCustomer = { id: string; name: string; phone: string; address?: string };

interface Props {
  value: string;
  onChange: (phone: string) => void;
  onSelect: (customer: ExistingCustomer) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function CustomerPhoneInput({ value, onChange, onSelect, className, placeholder, required }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['customer-search', value],
    queryFn: () => api.get('/customers', { params: { search: value } }).then((r) => r.data),
    enabled: value.length >= 3,
    staleTime: 5_000,
  });

  const results: ExistingCustomer[] = Array.isArray(data) ? data : (data?.data ?? []);

  useEffect(() => {
    setOpen(value.length >= 3 && results.length > 0);
  }, [value, results.length]);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        className={className}
        placeholder={placeholder}
        required={required}
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          {results.slice(0, 5).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
            >
              <UserCheck01 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="text-left">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
