'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from '@untitled-ui/icons-react';

export interface SelectOption { value: string; label: string; disabled?: boolean }
interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function SelectField({ value, options, onChange, placeholder = 'Select…', className = '', buttonClassName = '', disabled, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  return <div ref={ref} className={`relative ${className}`}>
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} {...aria}
      onClick={() => setOpen((isOpen) => !isOpen)}
      className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs outline-none transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}>
      <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>{selected?.label ?? placeholder}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="listbox" className="absolute left-0 top-[calc(100%+4px)] z-[10000] max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} disabled={option.disabled}
        onClick={() => { onChange(option.value); setOpen(false); }}
        className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted disabled:opacity-40">
        <span className="flex-1 truncate">{option.label}</span>{option.value === value && <Check className="h-4 w-4 text-primary" />}
      </button>)}
      {options.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No options available</p>}
    </div>}
  </div>;
}
