import { TextareaHTMLAttributes, forwardRef, useId, useEffect, useRef } from 'react';
import { cn, nbFocusRing } from '@/lib/utils/cn';

export interface NBTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea label (required for accessibility) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Helper text to display below textarea */
  helperText?: string;
  /** Show character counter (requires maxLength) */
  showCounter?: boolean;
  /** Auto-resize textarea to fit content */
  autoResize?: boolean;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows (only with autoResize) */
  maxRows?: number;
}

/**
 * Neo Brutalism Textarea Component
 *
 * Features:
 * - Label (required for accessibility)
 * - Error, success, and helper text states
 * - Character counter
 * - Auto-resize option
 * - Min/max rows control
 * - Keyboard accessible
 * - WCAG 2.1 AA compliant
 *
 * @example
 * ```tsx
 * <NBTextarea
 *   label="Description"
 *   placeholder="Enter description"
 *   maxLength={500}
 *   showCounter
 * />
 *
 * <NBTextarea
 *   label="Notes"
 *   autoResize
 *   minRows={3}
 *   maxRows={10}
 * />
 * ```
 */
export const NBTextarea = forwardRef<HTMLTextAreaElement, NBTextareaProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      showCounter,
      maxLength,
      autoResize = false,
      minRows = 4,
      maxRows,
      value,
      id,
      rows,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize functionality
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;

        // Calculate min and max heights based on rows
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const minHeight = lineHeight * minRows;
        const maxHeight = maxRows ? lineHeight * maxRows : Infinity;

        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value, autoResize, minRows, maxRows]);

    // Determine border color based on state
    const borderColor = error
      ? 'border-nb-danger'
      : success
        ? 'border-nb-success'
        : 'border-nb-black focus:border-nb-primary';

    return (
      <div className="space-y-1">
        {/* Label */}
        <label htmlFor={inputId} className="block text-sm font-semibold text-nb-black">
          {label}
          {props.required && <span className="text-nb-danger ml-1">*</span>}
        </label>

        {/* Textarea */}
        <textarea
          ref={(element) => {
            // Forward both refs
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref) {
              ref.current = element;
            }
            textareaRef.current = element;
          }}
          id={inputId}
          rows={autoResize ? minRows : rows}
          className={cn(
            'w-full px-4 py-3 bg-nb-white border-3 shadow-nb-sm resize-y',
            'font-medium placeholder:text-nb-gray-400',
            'disabled:bg-nb-gray-100 disabled:shadow-none disabled:cursor-not-allowed',
            autoResize && 'resize-none overflow-hidden',
            borderColor,
            nbFocusRing,
            className
          )}
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />

        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-nb-danger font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Success message */}
        {!error && success && (
          <p className="text-sm text-nb-success font-medium">{success}</p>
        )}

        {/* Helper text and counter */}
        {!error && (helperText || showCounter) && (
          <div className="flex justify-between items-center">
            {helperText && (
              <p id={`${inputId}-helper`} className="text-sm text-nb-gray-600">
                {helperText}
              </p>
            )}
            {showCounter && maxLength && (
              <p className="text-sm text-nb-gray-600">
                {typeof value === 'string' ? value.length : 0}/{maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

NBTextarea.displayName = 'NBTextarea';
