'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

import { cn, nbFocusRing } from '@/lib/utils/cn';
import { Label } from './label';
import { Popover, PopoverAnchor, PopoverContent } from './popover';
import type { ComboboxOption } from './combobox';

export interface FormMultiComboboxProps {
  label: string;
  options: ComboboxOption[];
  /** Controlled selected values (each matches an option's `value`). */
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * FormMultiCombobox — the standard multi-select: a labelled, type-to-search
 * dropdown with checkboxes and removable chips. The multi-select sibling of
 * `FormCombobox`; use it wherever a field takes several values (assigned areas…)
 * so every form select reads the same. Emits the selected `values` array.
 */
export function FormMultiCombobox({
  label,
  options,
  values,
  onChange,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyText = 'Tidak ditemukan',
  error,
  helperText,
  disabled = false,
  required = false,
  className,
}: FormMultiComboboxProps): React.JSX.Element {
  const id = React.useId();
  const messageId = `${id}-message`;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedSet = React.useMemo(() => new Set(values), [values]);
  const selectedOptions = React.useMemo(
    () => options.filter((o) => selectedSet.has(o.value)),
    [options, selectedSet],
  );
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) setQuery('');
  };

  const toggle = (value: string): void => {
    onChange(selectedSet.has(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-nb-danger">*</span>}
      </Label>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            disabled={disabled}
            onClick={() => handleOpenChange(!open)}
            className={cn(
              'flex min-h-[48px] w-full items-center justify-between gap-2 border-2 border-nb-black rounded-nb-base bg-nb-white px-4 text-base text-nb-black shadow-nb-md',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
              error && 'border-nb-danger',
              nbFocusRing,
            )}
          >
            <span className={cn('truncate', values.length === 0 && 'text-nb-gray-500')}>
              {values.length === 0 ? placeholder : `${values.length} dipilih`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden />
          </button>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b-2 border-nb-black px-3">
            <Search className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 w-full bg-transparent text-nb-body-sm text-nb-black outline-none placeholder:text-nb-gray-500"
            />
          </div>
          <ul id={listboxId} role="listbox" aria-multiselectable className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-nb-body-sm text-nb-gray-500">{emptyText}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onClick={() => !option.disabled && toggle(option.value)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-nb-sm px-3 py-2 text-nb-body-sm hover:bg-nb-gray-100',
                      isSelected && 'font-bold',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-nb-sm border-2 border-nb-black bg-nb-gray-100 px-2 py-0.5 text-nb-caption"
            >
              {option.label}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Hapus ${option.label}`}
                  onClick={() => toggle(option.value)}
                  className={cn('text-nb-gray-600 hover:text-nb-black', nbFocusRing)}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p id={messageId} className="text-nb-body-sm font-medium text-nb-danger" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={messageId} className="text-nb-body-sm text-nb-gray-600">
          {helperText}
        </p>
      )}
    </div>
  );
}
