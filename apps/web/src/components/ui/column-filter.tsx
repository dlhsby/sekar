'use client';

import { type Column, type FilterFn, type FilterFnOption } from '@tanstack/react-table';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Calendar, Hash, ListFilter, Search, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

import { Checkbox } from './checkbox';
import { DatePicker } from './date-picker';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/** Column data type. Drives which filter control + filterFn a column gets. */
export type FilterVariant = 'text' | 'number' | 'date' | 'enum';

/** `2026-06-24` → `24/06/2026`, '' if invalid. */
function formatDateForm(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
}

/**
 * Searchable haystack for a row value used by the plain `text` variant. Dates
 * would match what the user actually sees, but `date` now uses a real range
 * filter (see `dateRangeFilterFn`) — this stays for `text`/fallback columns.
 */
function searchableText(raw: unknown): string {
  if (raw == null) return '';
  return String(raw);
}

/** Case-insensitive "contains" — used by `text` (and as the default fallback). */
export const textContainsFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const search = String(value ?? '')
    .toLowerCase()
    .trim();
  if (!search) return true;
  return searchableText(row.getValue(columnId)).toLowerCase().includes(search);
};

/** `[min, max]` numeric range — either bound may be `undefined` (unbounded). */
export const numberRangeFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const [min, max] = (value as [number | undefined, number | undefined] | undefined) ?? [
    undefined,
    undefined,
  ];
  if (min == null && max == null) return true;
  const raw = row.getValue(columnId);
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(n)) return false;
  if (min != null && n < min) return false;
  if (max != null && n > max) return false;
  return true;
};

/** `[from, to]` ISO date-string range — either bound may be `undefined`. */
export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const [from, to] = (value as [string | undefined, string | undefined] | undefined) ?? [
    undefined,
    undefined,
  ];
  if (!from && !to) return true;
  const raw = row.getValue(columnId);
  if (typeof raw !== 'string' || !raw) return false;
  const d = parseISO(raw);
  if (!isValid(d)) return false;
  const iso = raw.slice(0, 10);
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
};

/** Multi-select — matches when the cell's string value is one of the selected set. */
export const enumFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const selected = value as string[] | undefined;
  if (!selected || selected.length === 0) return true;
  return selected.includes(String(row.getValue(columnId)));
};

/** Map a column's declared variant to its filterFn. */
export function filterFnForVariant<TData>(variant: FilterVariant): FilterFnOption<TData> {
  if (variant === 'date') return dateRangeFilterFn as FilterFn<TData>;
  if (variant === 'number') return numberRangeFilterFn as FilterFn<TData>;
  if (variant === 'enum') return enumFilterFn as FilterFn<TData>;
  return textContainsFilterFn as FilterFn<TData>;
}

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  label: string;
}

/** Shared trigger-button chrome for the popover-based variants (enum/number/date). */
const triggerClass = (active: boolean): string =>
  cn(
    'flex h-8 w-full min-w-[8.5rem] items-center gap-1.5 rounded-nb-sm border-2 px-2 text-nb-body-sm font-normal transition-colors',
    active ? 'border-nb-info bg-nb-info-light' : 'border-nb-gray-300 bg-nb-white hover:border-nb-black'
  );

/** Per-column contains-search input with a leading magnifier + inline clear (×). */
function TextColumnFilter<TData>({ column, label }: ColumnFilterProps<TData>): React.JSX.Element {
  const { t } = useTranslation();
  const value = (column.getFilterValue() as string | undefined) ?? '';
  return (
    <div className="relative w-full min-w-[8.5rem]">
      <Search
        className="pointer-events-none absolute inset-y-0 left-2 my-auto h-3.5 w-3.5 text-nb-gray-400"
        aria-hidden
      />
      <Input
        size="sm"
        value={value}
        // Empty → undefined so the column drops out of the active-filter count.
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder={t('components:columnFilter.placeholder')}
        aria-label={t('components:columnFilter.filterLabel', { label })}
        className={cn('h-8 w-full pl-7 pr-7 text-nb-body-sm font-normal', value && 'border-nb-info')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => column.setFilterValue(undefined)}
          aria-label={t('components:columnFilter.clearLabel', { label })}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-nb-gray-400 transition-colors hover:text-nb-black"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Excel/Sheets-style searchable multi-select checklist popover. */
function EnumColumnFilter<TData>({ column, label }: ColumnFilterProps<TData>): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];

  // Distinct values across the (other-filters-applied) data set, via TanStack faceting.
  // This only reflects rows currently loaded client-side — fine for tables that fetch
  // their full dataset, but wrong for server-paginated tables (a value on page 2 is
  // invisible while viewing page 1). Those columns must set `meta.filterOptions` with
  // the known full value set instead; when present it takes priority over faceting.
  const staticOptions = column.columnDef.meta?.filterOptions;
  const facets = column.getFacetedUniqueValues() as Map<unknown, number> | undefined;
  const options = React.useMemo(() => {
    if (staticOptions) {
      // The full value set is known up front, so an absent facet entry means
      // zero matching rows — show "(0)", don't hide the count like the
      // derived-from-data branch below (there, "no entry" means "haven't
      // seen this value at all", which is a different, unknown quantity).
      return staticOptions.map((o) => ({
        value: o.value,
        label: o.label,
        count: facets?.get(o.value) ?? 0,
      }));
    }
    const entries = facets ? Array.from(facets.entries()) : [];
    return entries
      .filter(([v]) => v != null && String(v) !== '')
      .map(([v, count]) => ({ value: String(v), label: String(v), count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [staticOptions, facets]);
  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (value: string): void => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    column.setFilterValue(next.length ? next : undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass(selected.length > 0)}
          aria-label={t('components:columnFilter.filterLabel', { label })}
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0 text-nb-gray-400" aria-hidden />
          <span className="truncate">
            {selected.length > 0
              ? t('components:columnFilter.selectedCount', { count: selected.length })
              : t('components:columnFilter.enumPlaceholder')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('components:columnFilter.enumSearchPlaceholder')}
          leftIcon={<Search className="h-3.5 w-3.5" aria-hidden />}
          className="mb-2"
          autoFocus
        />
        <div className="mb-1 flex items-center justify-between px-1 text-nb-caption">
          <button
            type="button"
            onClick={() => column.setFilterValue(options.map((o) => o.value))}
            className="font-bold text-nb-info hover:underline"
          >
            {t('components:columnFilter.selectAll')}
          </button>
          <button
            type="button"
            onClick={() => column.setFilterValue(undefined)}
            className="text-nb-gray-500 hover:underline"
          >
            {t('components:columnFilter.clearAll')}
          </button>
        </div>
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="px-1 py-2 text-nb-body-sm text-nb-gray-400">
              {t('components:columnFilter.enumNoOptions')}
            </p>
          ) : (
            filteredOptions.map((o) => (
              <Checkbox
                key={o.value}
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="w-full rounded-nb-sm px-1 py-1 hover:bg-nb-gray-100"
                label={
                  <span className="flex w-full min-w-0 items-center justify-between gap-2 text-nb-body-sm">
                    <span className="truncate">{o.label}</span>
                    {o.count != null ? (
                      <span className="shrink-0 text-nb-gray-400">{o.count}</span>
                    ) : null}
                  </span>
                }
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Min/max numeric range popover. */
function NumberRangeColumnFilter<TData>({
  column,
  label,
}: ColumnFilterProps<TData>): React.JSX.Element {
  const { t } = useTranslation();
  const [min, max] =
    (column.getFilterValue() as [number | undefined, number | undefined] | undefined) ?? [
      undefined,
      undefined,
    ];

  const apply = (nextMin: number | undefined, nextMax: number | undefined): void => {
    column.setFilterValue(nextMin == null && nextMax == null ? undefined : [nextMin, nextMax]);
  };

  const active = min != null || max != null;
  const summary =
    min != null && max != null
      ? `${min}–${max}`
      : min != null
        ? `≥${min}`
        : max != null
          ? `≤${max}`
          : t('components:columnFilter.numberPlaceholder');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass(active)}
          aria-label={t('components:columnFilter.filterLabel', { label })}
        >
          <Hash className="h-3.5 w-3.5 shrink-0 text-nb-gray-400" aria-hidden />
          <span className="truncate">{summary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            size="sm"
            value={min ?? ''}
            onChange={(e) => apply(e.target.value === '' ? undefined : Number(e.target.value), max)}
            placeholder={t('components:columnFilter.numberMinPlaceholder')}
            aria-label={t('components:columnFilter.numberMinPlaceholder')}
          />
          <span className="text-nb-gray-400">–</span>
          <Input
            type="number"
            size="sm"
            value={max ?? ''}
            onChange={(e) => apply(min, e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={t('components:columnFilter.numberMaxPlaceholder')}
            aria-label={t('components:columnFilter.numberMaxPlaceholder')}
          />
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => apply(undefined, undefined)}
            className="mt-2 text-nb-caption text-nb-gray-500 hover:underline"
          >
            {t('components:columnFilter.clearAll')}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** From/to date range popover (reuses the masked-input `DatePicker`). */
function DateRangeColumnFilter<TData>({
  column,
  label,
}: ColumnFilterProps<TData>): React.JSX.Element {
  const { t } = useTranslation();
  const [from, to] =
    (column.getFilterValue() as [string | undefined, string | undefined] | undefined) ?? [
      undefined,
      undefined,
    ];

  const apply = (nextFrom: string | undefined, nextTo: string | undefined): void => {
    column.setFilterValue(nextFrom == null && nextTo == null ? undefined : [nextFrom, nextTo]);
  };

  const active = Boolean(from || to);
  const summary = active
    ? `${from ? formatDateForm(from) : '…'} – ${to ? formatDateForm(to) : '…'}`
    : t('components:columnFilter.datePlaceholder');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass(active)}
          aria-label={t('components:columnFilter.filterLabel', { label })}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 text-nb-gray-400" aria-hidden />
          <span className="truncate">{summary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 p-3" align="start">
        <div className="space-y-1">
          <p className="text-nb-caption font-bold text-nb-gray-500">
            {t('components:columnFilter.dateRangeStartPlaceholder')}
          </p>
          <DatePicker value={from} onValueChange={(v) => apply(v, to)} disableFuture={false} />
        </div>
        <div className="space-y-1">
          <p className="text-nb-caption font-bold text-nb-gray-500">
            {t('components:columnFilter.dateRangeEndPlaceholder')}
          </p>
          <DatePicker value={to} onValueChange={(v) => apply(from, v)} disableFuture={false} />
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => apply(undefined, undefined)}
            className="text-nb-caption text-nb-gray-500 hover:underline"
          >
            {t('components:columnFilter.clearAll')}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Per-column filter control — the control shown is driven by `meta.filterVariant`. */
export function ColumnFilter<TData>({ column, label }: ColumnFilterProps<TData>): React.JSX.Element {
  const variant = (column.columnDef.meta?.filterVariant ?? 'text') as FilterVariant;
  if (variant === 'enum') return <EnumColumnFilter column={column} label={label} />;
  if (variant === 'number') return <NumberRangeColumnFilter column={column} label={label} />;
  if (variant === 'date') return <DateRangeColumnFilter column={column} label={label} />;
  return <TextColumnFilter column={column} label={label} />;
}
