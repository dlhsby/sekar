'use client';

import { format, isValid, parse } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { CalendarClock } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn, nbFocusRing } from '@/lib/utils/cn';

import { Calendar } from './calendar';
import { Input } from './input';
import { parseIso, usePopoverAnchor } from './picker-utils';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { TimeList } from './time-picker';

export interface DateTimePickerProps {
  /** Controlled value as `yyyy-MM-dd HH:mm` (or undefined / empty). */
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /** Disallow any date after today (calendar greys them out; typed dates revert). */
  disableFuture?: boolean;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function splitValue(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date = '', time = ''] = value.split(' ');
  return { date, time: time.slice(0, 5) };
}

/** Mask typed digits into `dd/MM/yyyy HH:mm` (separators auto-inserted). */
function maskDateTime(raw: string): string {
  const x = raw.replace(/\D/g, '').slice(0, 12);
  let s = x.slice(0, 2);
  if (x.length > 2) s += `/${x.slice(2, 4)}`;
  if (x.length > 4) s += `/${x.slice(4, 8)}`;
  if (x.length > 8) s += ` ${x.slice(8, 10)}`;
  if (x.length > 10) s += `:${x.slice(10, 12)}`;
  return s;
}

/** `yyyy-MM-dd HH:mm` → `dd/MM/yyyy HH:mm` for display; '' when incomplete. */
function toDisplay(value?: string): string {
  const { date, time } = splitValue(value);
  const d = parseIso(date);
  return d && time ? `${format(d, 'dd/MM/yyyy')} ${time}` : '';
}

/**
 * Parse a typed string into `yyyy-MM-dd HH:mm`, or null if unrecognized.
 * A bare `HH:mm` keeps the current date. Accepts `dd/MM/yyyy HH:mm` and ISO.
 */
function parseInput(text: string, currentDate: string): string | null {
  const s = text.trim();
  if (!s) return null;
  const timeOnly = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (timeOnly) {
    const hh = Math.min(23, Number(timeOnly[1]));
    const mm = Math.min(59, Number(timeOnly[2]));
    const datePart = currentDate || format(new Date(), 'yyyy-MM-dd');
    return `${datePart} ${pad(hh)}:${pad(mm)}`;
  }
  for (const fmt of ['dd/MM/yyyy HH:mm', 'd/M/yyyy HH:mm', 'dd/MM/yyyy H:mm', 'yyyy-MM-dd HH:mm']) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd HH:mm');
  }
  return null;
}

/**
 * DateTimePicker — one combined control: an editable masked field (type any
 * minute) plus a popover with a calendar on the left and a scrollable time list
 * on the right. Stores `yyyy-MM-dd HH:mm`. Neo Brutalism styling.
 */
export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      value,
      onValueChange,
      placeholder = 'dd/mm/yyyy HH:mm',
      disabled,
      error,
      className,
      disableFuture,
      id: controlId,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
    },
    ref
  ) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(toDisplay(value));
    const [focused, setFocused] = useState(false);
    const { date, time } = splitValue(value);
    const selectedDate = parseIso(date);
    const todayIso = format(new Date(), 'yyyy-MM-dd');

    useEffect(() => {
      if (!focused) setText(toDisplay(value));
    }, [value, focused]);

    const { anchorRef, insideAnchor } = usePopoverAnchor();

    const commit = (): void => {
      const parsed = parseInput(text, date);
      if (parsed && !(disableFuture && parsed.slice(0, 10) > todayIso)) {
        onValueChange?.(parsed);
      } else {
        setText(toDisplay(value));
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative">
            <Input
              ref={ref}
              id={controlId}
              type="text"
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
              onChange={(e) => setText(maskDateTime(e.target.value))}
              onBlur={() => {
                setFocused(false);
                commit();
              }}
              className={cn('tabular-nums pr-11', className)}
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={t('common:pickers.selectDateTime')}
                className={cn('absolute inset-y-0 right-0 flex items-center px-3 text-nb-gray-500 hover:text-nb-black disabled:cursor-not-allowed disabled:text-nb-gray-300', nbFocusRing)}
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
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
          <div className="flex items-start">
            <Calendar
              mode="single"
              defaultMonth={selectedDate}
              selected={selectedDate}
              disabled={disableFuture ? { after: parseIso(todayIso) ?? new Date() } : undefined}
              onSelect={(d) => {
                if (!d) return;
                onValueChange?.(`${format(d, 'yyyy-MM-dd')} ${time || '00:00'}`);
              }}
              locale={dateFnsLocale()}
            />
            <div className="self-stretch border-l-2 border-nb-black">
              <TimeList
                className="h-full max-h-[20rem] w-24"
                value={time}
                onSelect={(t) => {
                  onValueChange?.(`${date || format(new Date(), 'yyyy-MM-dd')} ${t}`);
                  setOpen(false);
                }}
              />
            </div>
          </div>
          <div className="flex justify-between gap-2 border-t-2 border-nb-black p-1.5">
            <button
              type="button"
              onClick={() => onValueChange?.(`${todayIso} ${time || '00:00'}`)}
              className="rounded-nb-base px-2 py-1.5 text-nb-body-sm font-semibold text-nb-success-dark hover:bg-nb-gray-100"
            >{t('common:pickers.today')}</button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                onValueChange?.(`${todayIso} ${format(d, 'HH:mm')}`);
                setOpen(false);
              }}
              className="rounded-nb-base px-2 py-1.5 text-nb-body-sm font-semibold text-nb-success-dark hover:bg-nb-gray-100"
            >
              Sekarang
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
