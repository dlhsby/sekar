'use client';

/**
 * MultiSelect — a compact "checkboxes in a dropdown" control.
 *
 * The lean sibling of {@link FormMultiCombobox}. That one is a FORM FIELD: a
 * 48px trigger, a label, removable chips, error and helper slots, and a search
 * box. All of that is right in a form and wrong in a dense settings popover,
 * where four of these sit stacked and the options are four short words that
 * nobody needs to search.
 *
 * So this keeps only what a toolbar control needs: a trigger that STATES the
 * current selection rather than counting it — with four short options they all
 * fit, and reading the panel should not require opening four dropdowns — and a
 * list of real checkboxes with an "all" row on top.
 *
 * The all-row is a checkbox rather than a link because that is what it behaves
 * like: it shows mixed when the selection is partial, and toggling it selects or
 * clears everything. Options and shortcut cannot disagree, since the shortcut
 * writes exactly the set the boxes do.
 */
import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn, nbFocusRing } from '@/lib/utils/cn';
import { Checkbox } from './checkbox';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  /** Controlled selection. Order is not significant. */
  values: string[];
  onChange: (values: string[]) => void;
  /** Names the control for assistive tech; there is no visible label. */
  ariaLabel: string;
  /** Shown when everything is selected, in place of listing every option. */
  allLabel: string;
  /** Shown when nothing is selected. */
  noneLabel: string;
  /** Label for the select-all / clear-all row. Defaults to {@link allLabel}. */
  selectAllLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Extra classes for the dropdown surface (e.g. to widen it past the trigger). */
  contentClassName?: string;
}

export function MultiSelect({
  options,
  values,
  onChange,
  ariaLabel,
  allLabel,
  noneLabel,
  selectAllLabel,
  disabled = false,
  className,
  contentClassName,
}: MultiSelectProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();
  const selected = React.useMemo(() => new Set(values), [values]);

  const allOn = options.length > 0 && options.every((o) => selected.has(o.value));
  const noneOn = values.length === 0;

  /**
   * What the closed control says. The selection itself when it is partial —
   * "Batas, Marker" is legible where "2 dipilih" would send the operator into
   * the dropdown to find out which two.
   */
  const summary = allOn
    ? allLabel
    : noneOn
      ? noneLabel
      : options
          .filter((o) => selected.has(o.value))
          .map((o) => o.label)
          .join(', ');

  const toggle = (value: string): void =>
    onChange(
      selected.has(value) ? values.filter((v) => v !== value) : [...values, value]
    );

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setOpen(!open)}
          // Sized to match a native `<select>` in the same surface: same height,
          // radius, border and type scale. A control that merely behaves like a
          // select should not read as a different KIND of control beside one.
          className={cn(
            'flex min-h-touch w-full items-center justify-between gap-2 rounded-nb-sm border-2 border-nb-black bg-nb-white px-2 py-1 text-left text-sm font-bold text-nb-black',
            'hover:bg-nb-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
            noneOn && 'text-nb-gray-500',
            nbFocusRing,
            className
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-nb-gray-500" aria-hidden />
        </button>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className={cn('min-w-[var(--radix-popover-trigger-width)] w-auto p-1', contentClassName)}
      >
        <ul id={listboxId} role="listbox" aria-multiselectable aria-label={ariaLabel}>
          <li role="option" aria-selected={allOn} className="border-b-2 border-nb-gray-100 pb-1">
            <Checkbox
              className="w-full rounded-nb-sm px-2 py-1.5 text-sm font-bold hover:bg-nb-gray-100"
              label={selectAllLabel ?? allLabel}
              checked={allOn}
              // Mixed, not unchecked: a partial selection is neither, and
              // showing it as unchecked would misreport the tier's state.
              indeterminate={!allOn && !noneOn}
              onChange={() => onChange(allOn ? [] : options.map((o) => o.value))}
            />
          </li>
          {options.map((option) => {
            const on = selected.has(option.value);
            return (
              <li key={option.value} role="option" aria-selected={on}>
                <Checkbox
                  className="w-full rounded-nb-sm px-2 py-1.5 text-sm font-bold hover:bg-nb-gray-100"
                  label={option.label}
                  checked={on}
                  onChange={() => toggle(option.value)}
                />
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
