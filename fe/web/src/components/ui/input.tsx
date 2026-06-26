'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn, nbFocusRing } from '@/lib/utils/cn';

const inputVariants = cva(
  `flex w-full bg-nb-white text-nb-black border-2 border-nb-black rounded-nb-base shadow-nb-sm
   placeholder:text-nb-gray-500
   disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
   ${nbFocusRing}`,
  {
    variants: {
      size: {
        sm: 'h-10 px-3 text-sm',
        default: 'h-12 px-4 text-base min-h-[48px]',
        lg: 'h-14 px-5 text-lg',
      },
      state: {
        default: '',
        error: 'border-nb-danger focus-visible:outline-nb-danger/50',
        success: 'border-nb-success focus-visible:outline-nb-success/50',
      },
    },
    defaultVariants: {
      size: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  helperText?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', size, state, error, helperText, leftIcon, rightIcon, ...props },
    ref
  ) => {
    const effectiveState = error ? 'error' : state;
    // Unique id per instance so multiple inputs don't collide on aria-describedby.
    const reactId = React.useId();
    const helperId = `input-helper-${reactId}`;
    const describedBy = error || helperText ? helperId : undefined;

    if (leftIcon || rightIcon) {
      return (
        <div className="relative w-full">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-nb-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ size, state: effectiveState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-nb-gray-500">
              {rightIcon}
            </div>
          )}
          {(error || helperText) && (
            <p
              id={helperId}
              className={cn('mt-1 text-sm', error ? 'text-nb-danger' : 'text-nb-gray-600')}
            >
              {error || helperText}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(inputVariants({ size, state: effectiveState }), className)}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {(error || helperText) && (
          <p
            id={helperId}
            className={cn('mt-1 text-sm', error ? 'text-nb-danger' : 'text-nb-gray-600')}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
