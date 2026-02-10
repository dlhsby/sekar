import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn, nbFocusRing } from '@/lib/utils/cn';

const textareaVariants = cva(
  `flex min-h-[120px] w-full bg-nb-white text-nb-black border-2 border-nb-black rounded-nb-base shadow-nb-sm p-4
   placeholder:text-nb-gray-500 resize-y
   disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
   ${nbFocusRing}`,
  {
    variants: {
      state: {
        default: '',
        error: 'border-nb-danger focus-visible:outline-nb-danger/50',
        success: 'border-nb-success focus-visible:outline-nb-success/50',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      state,
      label,
      error,
      helperText,
      showCount,
      maxLength,
      autoResize,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState((value as string) || '');
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const effectiveState = error ? 'error' : state;
    const currentLength = (value as string)?.length ?? internalValue.length;

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [autoResize, internalValue, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-semibold text-nb-black mb-2">{label}</label>}
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className={cn(
            textareaVariants({ state: effectiveState }),
            autoResize && 'overflow-hidden resize-none',
            className
          )}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error || helperText || showCount ? 'textarea-helper' : undefined}
          {...props}
        />
        <div className="flex justify-between mt-1">
          {(error || helperText) && (
            <p
              id="textarea-helper"
              className={cn('text-sm', error ? 'text-nb-danger' : 'text-nb-gray-600')}
            >
              {error || helperText}
            </p>
          )}
          {showCount && maxLength && (
            <p className="text-sm text-nb-gray-600 ml-auto">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
