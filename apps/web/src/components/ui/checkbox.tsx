'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Optional inline label rendered to the right of the box. */
  label?: React.ReactNode;
  /** Indeterminate (mixed) visual state. */
  indeterminate?: boolean;
}

/**
 * Checkbox — Neo Brutalism styled native checkbox (2px border, sage fill when
 * checked, hard focus ring). The native input is visually hidden but keeps full
 * keyboard + form semantics.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, indeterminate, checked, disabled, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? `checkbox-${reactId}`;
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <span className="relative inline-flex h-5 w-5">
          <input
            ref={innerRef}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          {/* Box — sibling of the peer input so peer-checked styling applies. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 border-2 border-nb-black rounded-nb-sm bg-nb-white shadow-nb-xs',
              'peer-checked:bg-nb-primary peer-indeterminate:bg-nb-primary',
              'peer-focus-visible:outline peer-focus-visible:outline-4 peer-focus-visible:outline-nb-primary/50 peer-focus-visible:outline-offset-2'
            )}
          />
          {/* Checkmark — also an input sibling; toggled by peer-checked. */}
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-nb-ink opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
          />
          {/* Indeterminate dash. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto h-0.5 w-2.5 bg-nb-black opacity-0 peer-indeterminate:opacity-100"
          />
        </span>
        {label != null && <span className="text-nb-body-sm text-nb-black">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
