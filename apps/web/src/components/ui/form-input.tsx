'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { Input, InputProps } from './input';
import { Label } from './label';

export interface FormInputProps extends InputProps {
  label: string;
  required?: boolean;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, required, id, error, state, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn('space-y-1', className)}>
        <Label htmlFor={inputId}>
          {label}
          {required && <span className="text-nb-danger ml-1">*</span>}
        </Label>
        {/*
          Pass only the error STATE (border colour) to Input — never the error
          string. Input renders its own message when given `error`, so passing
          it here would duplicate the message FormInput renders below.
        */}
        <Input
          ref={ref}
          id={inputId}
          required={required}
          state={error ? 'error' : state}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="text-nb-body-sm text-nb-danger font-medium"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

export { FormInput };
