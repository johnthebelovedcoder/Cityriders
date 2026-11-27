'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from '@untitled-ui/icons-react';
import { SelectField } from './SelectField';

const pad = (value: number) => String(value).padStart(2, '0');
const valueFromDate = (date: Date, hour: number, minute: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).toISOString();
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props { value: string; onChange: (value: string) => void; className?: string; disabled?: boolean; mode?: 'date' | 'datetime'; minDate?: string; 'aria-label'?: string }

export function DateTimePicker({ value, onChange, className = '', disabled, mode = 'datetime', minDate, ...aria }: Props) {
  const parsed = value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value) : new Date();
  const valid = !!value && !Number.isNaN(parsed.getTime());
  const selected = valid ? parsed : new Date();
  const min = minDate ? new Date(minDate) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  function changeDate(day: number) {
    const date = new Date(view.getFullYear(), view.getMonth(), day);
    onChange(mode === 'date' ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : valueFromDate(date, selected.getHours(), selected.getMinutes()));
    if (mode === 'date') setOpen(false);
  }
  function changeTime(part: 'hour' | 'minute', next: string) {
    const hour = part === 'hour' ? Number(next) : selected.getHours();
    const minute = part === 'minute' ? Number(next) : selected.getMinutes();
    const nextDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, minute);
    if (min && nextDate < min) return;
    onChange(nextDate.toISOString());
  }

  const firstDay = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const display = valid ? selected.toLocaleString('en-NG', mode === 'date' ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : mode === 'date' ? 'Choose date' : 'Choose date and time';

  return <div ref={root} className={`relative ${className}`}>
    <button type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} {...aria} onClick={() => { setView(new Date(selected.getFullYear(), selected.getMonth(), 1)); setOpen((show) => !show); }}
      className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-sm transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" /><span className={`flex-1 truncate ${valid ? '' : 'text-muted-foreground'}`}>{display}</span>{mode === 'datetime' && <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
    {open && <div role="dialog" aria-label={mode === 'date' ? 'Choose date' : 'Choose date and time'} className="absolute left-0 top-[calc(100%+6px)] z-[10000] w-[296px] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-sm font-semibold">{view.toLocaleString('en-NG', { month: 'long', year: 'numeric' })}</p>
        <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">{weekdays.map((day) => <span key={day} className="py-1 text-[10px] font-semibold uppercase text-muted-foreground">{day}</span>)}
        {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const active = selected.getFullYear() === view.getFullYear() && selected.getMonth() === view.getMonth() && selected.getDate() === day;
          const today = new Date();
          const isToday = today.getFullYear() === view.getFullYear() && today.getMonth() === view.getMonth() && today.getDate() === day;
          const candidate = new Date(view.getFullYear(), view.getMonth(), day);
          const isBeforeMinimum = !!min && candidate < new Date(min.getFullYear(), min.getMonth(), min.getDate());
          return <button key={day} type="button" aria-pressed={active} disabled={isBeforeMinimum} onClick={() => changeDate(day)} className={`h-9 rounded-lg text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'bg-primary font-semibold text-primary-foreground' : isToday ? 'border border-primary/40 text-primary' : 'hover:bg-muted'}`}>{day}</button>;
        })}
      </div>
      {mode === 'datetime' && <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <span className="text-xs font-medium text-muted-foreground">Time</span>
        <SelectField aria-label="Hour" value={pad(selected.getHours())} onChange={(next) => changeTime('hour', next)} className="flex-1" options={Array.from({ length: 24 }, (_, hour) => ({ value: pad(hour), label: pad(hour), disabled: !!min && selected.toDateString() === min.toDateString() && hour < min.getHours() }))} />
        <span className="text-muted-foreground">:</span>
        <SelectField aria-label="Minute" value={pad(selected.getMinutes())} onChange={(next) => changeTime('minute', next)} className="flex-1" options={Array.from({ length: 60 }, (_, minute) => ({ value: pad(minute), label: pad(minute), disabled: !!min && selected.toDateString() === min.toDateString() && selected.getHours() === min.getHours() && minute < min.getMinutes() }))} />
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Done</button>
      </div>}
    </div>}
  </div>;
}
