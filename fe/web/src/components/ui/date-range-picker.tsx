'use client';

import { format } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, useRef, useState } from 'react';
import { type DateRange as RdpDateRange } from 'react-day-picker';

import { cn } from '@/lib/utils/cn';

import { Button } from './button';
import { Calendar } from './calendar';
import { parseIso, toIso } from './picker-utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/** Range value: inclusive ISO `yyyy-MM-dd` endpoints. */
export interface DateRangeValue {
  from: string;
  to: string;
}

interface PresetDef {
  key: string;
  label: string;
  range: (today: string) => DateRangeValue;
}

/** Shift an ISO `yyyy-MM-dd` by `delta` days (UTC-anchored, month-safe). */
function shiftIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta)).toISOString().slice(0, 10);
}

/** First day of the month containing `iso`. */
function monthStart(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

/** Compact `d MMM yy` label, e.g. `24 Jun 26`. */
function label(value: string): string {
  const d = parseIso(value);
  return d ? format(d, 'd MMM yy', { locale: dateFnsLocale() }) : value;
}

/** Self-contained Indonesian quick-range presets. */
const PRESETS: readonly PresetDef[] = [
  { key: 'today', label: 'Hari Ini', range: (t) => ({ from: t, to: t }) },
  { key: 'yesterday', label: 'Kemarin', range: (t) => ({ from: shiftIso(t, -1), to: shiftIso(t, -1) }) },
  { key: 'last7', label: '7 Hari', range: (t) => ({ from: shiftIso(t, -6), to: t }) },
  { key: 'last30', label: '30 Hari', range: (t) => ({ from: shiftIso(t, -29), to: t }) },
  { key: 'thisMonth', label: 'Bulan Ini', range: (t) => ({ from: monthStart(t), to: t }) },
  {
    key: 'lastMonth',
    label: 'Bulan Lalu',
    range: (t) => {
      const firstThis = monthStart(t);
      const lastPrev = shiftIso(firstThis, -1);
      return { from: monthStart(lastPrev), to: lastPrev };
    },
  },
];

export interface DateRangePickerProps {
  /** Controlled range value (ISO endpoints). */
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  /** ISO `yyyy-MM-dd` baseline for presets + future clamp. Defaults to today. */
  today?: string;
  /** Disallow selecting dates after `today`. Defaults to true. */
  disableFuture?: boolean;
  /**
   * Show the prev/next-day stepper buttons flanking the trigger when the range
   * is a single day. Defaults to true; set false for from/to range filters where
   * day-stepping doesn't apply.
   */
  showSteppers?: boolean;
  className?: string;
}

/**
 * DateRangePicker — a trigger showing the active range that opens a two-month
 * range calendar plus quick-range chips. Controlled (the parent owns the range).
 * First day-click sets the start (popover stays open, end can be hover-previewed)
 * and the second click commits the range. A preset chip commits immediately.
 */
export function DateRangePicker({
  value,
  onChange,
  today: todayProp,
  disableFuture = true,
  showSteppers = true,
  className,
}: DateRangePickerProps): React.JSX.Element {
  const today = todayProp ?? format(new Date(), 'yyyy-MM-dd');
  const [open, setOpen] = useState(false);
  // Two-click range driven by hand: `start` is the chosen first endpoint and
  // `hovered` is the day under the cursor, so we render a LIVE preview band.
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [hovered, setHovered] = useState<Date | undefined>(undefined);
  const picking = start !== undefined;
  // Gate the hover preview behind a REAL pointer displacement so the click that
  // sets the start doesn't immediately band start→today via a stray mouseenter.
  const armed = useRef(false);
  const clickPoint = useRef<{ x: number; y: number } | null>(null);

  const activePreset = PRESETS.find((p) => {
    const r = p.range(today);
    return r.from === value.from && r.to === value.to;
  });

  const triggerLabel =
    value.from === value.to
      ? label(value.from)
      : `${label(value.from)} – ${label(value.to)}`;

  const isSingleDay = value.from === value.to;
  const canStepNext = !disableFuture || value.to < today;
  const stepDay = (delta: number): void => {
    const next = shiftIso(value.from, delta);
    if (delta > 0 && disableFuture && next > today) return;
    onChange({ from: next, to: next });
  };

  const reset = (): void => {
    setStart(undefined);
    setHovered(undefined);
    armed.current = false;
    clickPoint.current = null;
  };
  const commit = (range: DateRangeValue): void => {
    reset();
    onChange(range);
    setOpen(false);
  };

  const selectedRange: RdpDateRange | undefined =
    picking && start
      ? hovered && hovered > start
        ? { from: start, to: hovered }
        : { from: start, to: start }
      : { from: parseIso(value.from), to: parseIso(value.to) };

  const onSelect = (
    _range: RdpDateRange | undefined,
    day: Date,
    _modifiers: unknown,
    e: MouseEvent | KeyboardEvent
  ): void => {
    if (start === undefined || toIso(day) < toIso(start)) {
      setStart(day);
      setHovered(undefined);
      armed.current = false;
      clickPoint.current = 'clientX' in e ? { x: e.clientX, y: e.clientY } : null;
      return;
    }
    commit({ from: toIso(start), to: toIso(day) });
  };
  const onPointerMove = (e: { clientX: number; clientY: number }): void => {
    const anchor = clickPoint.current;
    if (!anchor) return;
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    if (dx * dx + dy * dy > 16) armed.current = true;
  };
  const onDayMouseEnter = (day: Date): void => {
    if (picking && armed.current && (!disableFuture || toIso(day) <= today)) setHovered(day);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        reset();
      }}
    >
      <div className={cn('inline-flex items-center gap-1', className)}>
        {showSteppers && isSingleDay ? (
          <Button
            variant="outline"
            size="sm"
            className="w-10 px-0"
            aria-label="Hari sebelumnya"
            onClick={() => stepDay(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 font-semibold">
            <CalendarIcon className="h-4 w-4 text-nb-gray-500" aria-hidden />
            <span className="tabular-nums">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        {showSteppers && isSingleDay ? (
          <Button
            variant="outline"
            size="sm"
            className="w-10 px-0"
            aria-label="Hari berikutnya"
            disabled={!canStepNext}
            onClick={() => stepDay(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <div onPointerMove={onPointerMove}>
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={parseIso(value.to)}
            selected={selectedRange}
            onSelect={onSelect}
            onDayMouseEnter={onDayMouseEnter}
            disabled={disableFuture ? { after: parseIso(today) ?? new Date() } : undefined}
            locale={dateFnsLocale()}
            classNames={{
              months: 'flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8',
              month: 'flex flex-col items-center space-y-3',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              week: 'flex mt-1',
              day_button:
                'inline-flex h-9 w-9 items-center justify-center rounded-nb-base text-nb-black hover:bg-nb-gray-100',
              range_start:
                '[&>button]:rounded-nb-base [&>button]:border-2 [&>button]:border-nb-black [&>button]:bg-nb-primary [&>button]:font-bold [&>button]:text-nb-ink [&>button]:hover:bg-nb-primary',
              range_end:
                '[&>button]:rounded-nb-base [&>button]:border-2 [&>button]:border-nb-black [&>button]:bg-nb-primary [&>button]:font-bold [&>button]:text-nb-ink [&>button]:hover:bg-nb-primary',
              range_middle:
                'aria-selected:bg-nb-primary/30 aria-selected:text-nb-black',
              today: '[&>button]:font-bold [&>button]:text-nb-success-dark',
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 border-t-2 border-nb-black p-2">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={activePreset?.key === p.key ? 'default' : 'outline'}
              onClick={() => commit(p.range(today))}
              className="whitespace-nowrap px-2"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
