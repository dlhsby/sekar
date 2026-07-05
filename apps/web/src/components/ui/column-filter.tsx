'use client';

import { type Column, type FilterFn, type FilterFnOption } from '@tanstack/react-table';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

import { Input } from './input';

/** Column data type. Drives the filterFn only — every variant uses the same
 * contains-search text box. `date` additionally matches the displayed forms. */
export type FilterVariant = 'text' | 'number' | 'date';

/** `2026-06-24` → `24 Jun 2026` (display) or `24/06/2026` (form), '' if invalid. */
function formatDateDisplay(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'd MMM yyyy', { locale: dateFnsLocale() }) : '';
}
function formatDateForm(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
}

/**
 * Searchable haystack for a row value. Dates match what the user actually sees
 * ("24 Jun 2026" and "24/06/2026") plus the raw ISO.
 */
function searchableText(raw: unknown, variant: FilterVariant): string {
  if (raw == null) return '';
  if (variant === 'date' && typeof raw === 'string' && raw) {
    try {
      return `${formatDateDisplay(raw)} ${formatDateForm(raw)} ${raw}`;
    } catch {
      return raw;
    }
  }
  return String(raw);
}

/** Case-insensitive "contains" that also matches formatted dates. */
export const dateContainsFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const search = String(value ?? '')
    .toLowerCase()
    .trim();
  if (!search) return true;
  return searchableText(row.getValue(columnId), 'date').toLowerCase().includes(search);
};

/**
 * Map a column's declared variant to its filterFn. `number` and `text` use the
 * built-in string-contains; `date` uses the formatted-aware contains so the user
 * can type the date as shown.
 */
export function filterFnForVariant<TData>(variant: FilterVariant): FilterFnOption<TData> {
  if (variant === 'date') return dateContainsFilterFn as FilterFn<TData>;
  return 'includesString';
}

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  label: string;
}

/** Per-column contains-search input with a leading magnifier + inline clear (×). */
export function ColumnFilter<TData>({
  column,
  label,
}: ColumnFilterProps<TData>): React.JSX.Element {
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
