'use client';

import { useState } from 'react';

interface Props {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
}

export function MoneyInput({ value, onChange, placeholder = '0', className }: Props) {
  const [focused, setFocused] = useState(false);

  const display = focused
    ? value
    : value
    ? Number(value.replace(/,/g, '')).toLocaleString()
    : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    onChange(raw);
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₦</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className ?? 'flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
      />
    </div>
  );
}

