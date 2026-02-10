import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { Input, InputProps } from './input';
import { Label } from './label';

export interface FormInputProps extends InputProps {
  label: string;
  required?: boolean;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, required, id, error, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('space-y-1', className)}>
        <Label htmlFor={inputId}>
          {label}
          {required && <span className="text-nb-danger ml-1">*</span>}
        </Label>
        <Input ref={ref} id={inputId} required={required} error={error} {...props} />
        {error && (
          <p className="text-sm text-nb-danger font-medium" role="alert" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

export { FormInput };
