'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from '@untitled-ui/icons-react';

export type DateRange = { from: string; to: string };

function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

const PRESETS = [
  {
    label: 'Today', key: 'today',
    compute: () => { const t = todayStr(); return { from: t, to: t }; },
  },
  {
    label: 'This Week', key: 'this-week',
    compute: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: dateStr(start), to: todayStr() };
    },
  },
  {
    label: 'This Month', key: 'this-month',
    compute: () => {
      const now = new Date();
      return { from: dateStr(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayStr() };
    },
  },
  {
    label: 'Last Month', key: 'last-month',
    compute: () => {
      const now = new Date();
      return {
        from: dateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: dateStr(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: 'This Year', key: 'this-year',
    compute: () => ({ from: dateStr(new Date(new Date().getFullYear(), 0, 1)), to: todayStr() }),
  },
  {
    label: 'Last Year', key: 'last-year',
    compute: () => {
      const y = new Date().getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
  { label: 'Custom range', key: 'custom', compute: () => { const t = todayStr(); return { from: t, to: t }; } },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultPreset?: string;
  className?: string;
}

export function PeriodFilter({ value, onChange, defaultPreset = 'this-month', className }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(defaultPreset);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preset = PRESETS.find((p) => p.key === defaultPreset);
    if (preset && preset.key !== 'custom') onChange(preset.compute());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(key: string) {
    setActive(key);
    setOpen(false);
    if (key !== 'custom') {
      const preset = PRESETS.find((p) => p.key === key)!;
      onChange(preset.compute());
    }
  }

  const activeLabel = PRESETS.find((p) => p.key === active)?.label ?? 'This Month';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="whitespace-nowrap">{activeLabel}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-10 z-50 min-w-[160px] rounded-lg border bg-popover shadow-lg">
            <div className="p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelect(p.key)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${active === p.key ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  {active === p.key
                    ? <Check className="h-3.5 w-3.5 shrink-0" />
                    : <span className="h-3.5 w-3.5 shrink-0" />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {active === 'custom' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">-</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

export function usePeriodFilter(defaultPreset = 'this-month') {
  const preset = PRESETS.find((p) => p.key === defaultPreset)!;
  const initial = preset.compute();
  const [range, setRange] = useState<DateRange>(initial);
  return { range, setRange };
}

