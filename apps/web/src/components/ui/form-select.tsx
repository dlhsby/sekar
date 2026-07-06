'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string;
  options: FormSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}

const FormSelect = React.forwardRef<HTMLDivElement, FormSelectProps>(
  ({
    label,
    options,
    value = '',
    onChange,
    placeholder = 'Select...',
    error,
    helperText,
    disabled = false,
    className,
    required = false,
    ...props
  }, ref) => {
    const id = React.useId();
    const messageId = `${id}-message`;

    return (
      <div className={cn('space-y-1', className)} ref={ref} {...props}>
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-nb-danger ml-1">*</span>}
        </Label>

        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            id={id}
            error={!!error}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <p
            id={messageId}
            className="text-nb-body-sm text-nb-danger font-medium"
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
);

FormSelect.displayName = 'FormSelect';

export { FormSelect };
