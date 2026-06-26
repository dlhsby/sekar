'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { Label } from './label';

/** Control wiring injected into a Field's render-prop children. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FieldProps {
  label: string;
  required?: boolean;
  /** Validation message — renders below and flags the control invalid. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Explicit control id (else auto-generated). */
  htmlFor?: string;
  className?: string;
  /**
   * Either plain control markup or a render function receiving the field's
   * `id` / `aria-describedby` / `aria-invalid` so the control wires up a11y.
   */
  children: React.ReactNode | ((props: FieldControlProps) => React.ReactNode);
}

/**
 * Field — a labelled form-control shell (label + required marker + control slot
 * + error/hint) shared by pickers, checkboxes and selects so each control
 * doesn't re-implement label/error wiring. Neo Brutalism styling.
 */
export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: FieldProps): React.JSX.Element {
  const reactId = React.useId();
  const controlId = htmlFor ?? `field-${reactId}`;
  const messageId = `${controlId}-message`;
  const describedBy = error || hint ? messageId : undefined;

  const controlProps: FieldControlProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={controlId}>
        {label}
        {required && <span className="ml-1 text-nb-danger">*</span>}
      </Label>
      {typeof children === 'function' ? children(controlProps) : children}
      {error ? (
        <p
          id={messageId}
          className="text-nb-body-sm font-medium text-nb-danger"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-nb-body-sm text-nb-gray-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
