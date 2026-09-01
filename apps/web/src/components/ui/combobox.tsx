'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn, nbFocusRing } from '@/lib/utils/cn';
import { useWheelScrollFix } from '@/lib/hooks/useWheelScrollFix';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  /** Controlled selected value (matches an option's `value`). */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Search box placeholder inside the popover. */
  searchPlaceholder?: string;
  /** Shown when the filter matches no options. */
  emptyText?: string;
  /** Allow clearing the selection via an inline ✕ (and re-selecting toggles off). */
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Combobox — a filterable single-select autocomplete (Neo Brutalism). Type to
 * filter; ArrowUp/Down to move; Enter to select; Escape to close. Implements the
 * ARIA combobox/listbox pattern (aria-expanded / aria-activedescendant).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder: _placeholder,
  searchPlaceholder: _searchPlaceholder,
  emptyText: _emptyText,
  clearable = false,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: ComboboxProps): React.JSX.Element {
  const { t } = useTranslation();
  const placeholder = _placeholder ?? t('common:ui.combobox.placeholder');
  const searchPlaceholder = _searchPlaceholder ?? t('common:ui.combobox.searchPlaceholder');
  const emptyText = _emptyText ?? t('common:ui.combobox.noResults');
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Lazy render: show a page at a time, growing on scroll, so a long list (e.g.
  // hundreds of lokasi/workers) never renders all its rows at once. Type-to-search
  // narrows first; this caps whatever's left.
  const PAGE_SIZE = 50;
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const reactId = React.useId();
  const listboxId = `${reactId}-listbox`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxScrollRef = useWheelScrollFix<HTMLUListElement>();

  const selected = options.find((o) => o.value === value);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Rows actually rendered — the lazy page, but always deep enough to include the
  // keyboard-active row so aria-activedescendant never points at an unrendered id.
  const renderCount = Math.min(filtered.length, Math.max(limit, activeIndex + 6));
  const visible = filtered.slice(0, renderCount);
  const hasMore = renderCount < filtered.length;

  const optionId = (i: number): string => `${reactId}-opt-${i}`;

  // Reset transient state on open/close (resetting the highlight as the filter
  // narrows happens in the search box's onChange) — no setState-in-effect.
  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    setActiveIndex(0);
    setLimit(PAGE_SIZE);
    if (!next) setQuery('');
  };

  const onListScroll = (e: React.UIEvent<HTMLUListElement>): void => {
    const el = e.currentTarget;
    if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      setLimit((l) => l + PAGE_SIZE);
    }
  };

  const commit = (option: ComboboxOption): void => {
    if (option.disabled) return;
    // Re-selecting the current value clears it when clearable.
    onValueChange?.(clearable && option.value === value ? '' : option.value);
    handleOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        handleOpenChange(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn('relative', className)}>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid || undefined}
            aria-describedby={ariaDescribedBy}
            disabled={disabled}
            onClick={() => handleOpenChange(!open)}
            className={cn(
              'flex min-h-[48px] w-full items-center justify-between gap-2 border-2 border-nb-black rounded-nb-base bg-nb-white px-4 text-base text-nb-black shadow-nb-md',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
              ariaInvalid && 'border-nb-danger',
              nbFocusRing
            )}
          >
            <span className={cn('truncate', !selected && 'text-nb-gray-500')}>
              {selected ? selected.label : placeholder}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {/* Spacer reserving room for the clear button (a real sibling
                  button below — it can't nest inside this trigger button). */}
              {clearable && selected ? <span className="h-4 w-4" aria-hidden /> : null}
              <ChevronsUpDown className="h-4 w-4 text-nb-gray-500" aria-hidden />
            </span>
          </button>
          {clearable && selected ? (
            <button
              type="button"
              aria-label={t('common:actions.removeSelection')}
              onClick={(e) => {
                e.stopPropagation();
                onValueChange?.('');
              }}
              className={cn(
                'absolute right-9 top-1/2 -translate-y-1/2 text-nb-gray-500 hover:text-nb-black',
                nbFocusRing
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
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
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={filtered[activeIndex] ? optionId(activeIndex) : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setLimit(PAGE_SIZE);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className="h-11 w-full bg-transparent text-nb-body-sm text-nb-black outline-none placeholder:text-nb-gray-500"
          />
        </div>
        <ul
          ref={listboxScrollRef}
          id={listboxId}
          role="listbox"
          onScroll={onListScroll}
          className="max-h-60 overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-nb-body-sm text-nb-gray-500">{emptyText}</li>
          ) : (
            visible.map((option, i) => {
              const isSelected = option.value === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={option.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(option)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-nb-sm px-3 py-2 text-nb-body-sm',
                    isActive && 'bg-nb-gray-100',
                    isSelected && 'font-bold',
                    option.disabled && 'cursor-not-allowed opacity-50'
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
  );
}
