'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils/cn';
import { Label } from './label';
import { Combobox, type ComboboxOption } from './combobox';

export interface FormComboboxProps {
  label: string;
  options: ComboboxOption[];
  /** Controlled value; `undefined`/'' means nothing selected (placeholder shown). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  /** Allow clearing back to "no selection" via an inline ✕. Default true. */
  clearable?: boolean;
  className?: string;
}

/**
 * FormCombobox — the standard form select: a labelled, type-to-search single
 * select (wraps `Combobox`). Use this instead of `FormSelect` for any list the
 * user might want to filter (roles, rayon, shift, area, worker…). Default state
 * is nothing-selected (placeholder shown) unless a value is passed.
 */
export function FormCombobox({
  label,
  options,
  value,
  onChange,
  placeholder: _placeholder,
  searchPlaceholder: _searchPlaceholder,
  emptyText: _emptyText,
  error,
  helperText,
  disabled = false,
  required = false,
  clearable = true,
  className,
}: FormComboboxProps): React.JSX.Element {
  const { t } = useTranslation();
  const placeholder = _placeholder ?? t('common:ui.combobox.placeholder');
  const searchPlaceholder = _searchPlaceholder ?? t('common:ui.combobox.searchPlaceholder');
  const emptyText = _emptyText ?? t('common:ui.combobox.noResults');
  const id = React.useId();
  const messageId = `${id}-message`;

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-nb-danger">*</span>}
      </Label>

      <Combobox
        id={id}
        options={options}
        value={value ?? ''}
        onValueChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        clearable={clearable}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
      />

      {error && (
        <p
          id={messageId}
          className="text-nb-body-sm font-medium text-nb-danger"
          role="alert"
          aria-live="polite"
        >
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
