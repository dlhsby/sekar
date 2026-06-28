'use client';

import { format, isValid, parse } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

import { cn, nbFocusRing } from '@/lib/utils/cn';

import { Calendar } from './calendar';
import { Input } from './input';
import { parseIso, usePopoverAnchor } from './picker-utils';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  /** Controlled value as an ISO date string (yyyy-MM-dd) or undefined. */
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /** Disallow any date after today (calendar greys them out; typed dates revert). */
  disableFuture?: boolean;
  /** Show prev/next-day stepper buttons flanking the field (off by default). */
  nav?: boolean;
  /** Form-control wiring (id + aria) forwarded onto the input. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** Mask typed digits into `dd/MM/yyyy` (separators auto-inserted). */
function maskDate(raw: string): string {
  const x = raw.replace(/\D/g, '').slice(0, 8);
  let s = x.slice(0, 2);
  if (x.length > 2) s += `/${x.slice(2, 4)}`;
  if (x.length > 4) s += `/${x.slice(4, 8)}`;
  return s;
}

/** Parse a typed `dd/MM/yyyy` into ISO `yyyy-MM-dd`, or null if unrecognized. */
function parseInput(text: string): string | null {
  const s = text.trim();
  if (!s) return null;
  for (const fmt of ['dd/MM/yyyy', 'd/M/yyyy']) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

function toDisplay(value?: string): string {
  const d = parseIso(value);
  return d ? format(d, 'dd/MM/yyyy', { locale: id }) : '';
}

/**
 * DatePicker — editable masked field (type dd/MM/yyyy) plus a calendar popover.
 * Stores ISO yyyy-MM-dd. Garbage input reverts on blur. Neo Brutalism styling.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value,
    onValueChange,
    placeholder = 'dd/mm/yyyy',
    disabled,
    error,
    className,
    disableFuture,
    nav = false,
    id: controlId,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(toDisplay(value));
  const [focused, setFocused] = useState(false);
  const selected = parseIso(value);
  const todayIso = format(new Date(), 'yyyy-MM-dd');

  /** Step the value by ±1 day. Next is clamped under disableFuture. */
  const step = (delta: number): void => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return;
    const next = new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
    if (delta > 0 && disableFuture && next > todayIso) return;
    onValueChange?.(next);
  };
  const canStepNext = !!value && !(disableFuture && value >= todayIso);

  useEffect(() => {
    if (!focused) setText(toDisplay(value));
  }, [value, focused]);

  const { anchorRef, insideAnchor } = usePopoverAnchor();

  const commit = (): void => {
    const s = text.trim();
    if (!s) {
      onValueChange?.(undefined);
      return;
    }
    const parsed = parseInput(s);
    if (parsed && !(disableFuture && parsed > todayIso)) onValueChange?.(parsed);
    else setText(toDisplay(value));
  };

  const stepButton =
    'inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-sm hover:bg-nb-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

  const field = (
    <PopoverAnchor asChild>
      <div ref={anchorRef} className="relative flex-1">
        <Input
          ref={ref}
          id={controlId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          state={error ? 'error' : 'default'}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error || ariaInvalid || undefined}
          value={text}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onChange={(e) => setText(maskDate(e.target.value))}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          className={cn('pr-11', className)}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Pilih tanggal"
            className={cn('absolute inset-y-0 right-0 flex items-center px-3 text-nb-gray-500 hover:text-nb-black disabled:cursor-not-allowed disabled:text-nb-gray-300', nbFocusRing)}
          >
            <CalendarIcon className="h-4 w-4" aria-hidden />
          </button>
        </PopoverTrigger>
      </div>
    </PopoverAnchor>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {nav ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={stepButton}
            aria-label="Hari sebelumnya"
            disabled={disabled || !value}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {field}
          <button
            type="button"
            className={stepButton}
            aria-label="Hari berikutnya"
            disabled={disabled || !canStepNext}
            onClick={() => step(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        field
      )}
      <PopoverContent
        align="start"
        className="w-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
      >
        <Calendar
          mode="single"
          defaultMonth={selected}
          selected={selected}
          disabled={disableFuture ? { after: parseIso(todayIso) ?? new Date() } : undefined}
          onSelect={(d) => {
            onValueChange?.(d ? format(d, 'yyyy-MM-dd') : undefined);
            setOpen(false);
          }}
          locale={id}
        />
        <div className="border-t-2 border-nb-black p-1.5">
          <button
            type="button"
            onClick={() => {
              onValueChange?.(todayIso);
              setOpen(false);
            }}
            className="w-full rounded-nb-base px-2 py-1.5 text-nb-body-sm font-semibold text-nb-success-dark hover:bg-nb-gray-100"
          >
            Hari ini
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
