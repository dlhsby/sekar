'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Optional inline label rendered to the right of the control. */
  label?: React.ReactNode;
}

/**
 * Radio — Neo Brutalism styled native radio (2px border, sage dot when checked,
 * hard focus ring). Group several by sharing the same `name`.
 */
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, checked, disabled, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? `radio-${reactId}`;
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
            ref={ref}
            id={inputId}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          {/* Ring — sibling of the peer input so peer-checked styling applies. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-full border-2 border-nb-black bg-nb-white shadow-nb-xs',
              'peer-focus-visible:outline peer-focus-visible:outline-4 peer-focus-visible:outline-nb-primary/50 peer-focus-visible:outline-offset-2'
            )}
          />
          {/* Inner dot. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-nb-primary opacity-0 peer-checked:opacity-100"
          />
        </span>
        {label != null && <span className="text-nb-body-sm text-nb-black">{label}</span>}
      </label>
    );
  }
);
Radio.displayName = 'Radio';

export { Radio };
