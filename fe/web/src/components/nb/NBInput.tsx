import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn, nbFocusRing } from '@/lib/utils/cn';

export interface NBInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label (required for accessibility) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Icon or text to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon or text to display on the right */
  rightIcon?: React.ReactNode;
  /** Text to display on the left (inside input) */
  leftText?: string;
  /** Text to display on the right (inside input) */
  rightText?: string;
  /** Show character counter (requires maxLength) */
  showCounter?: boolean;
}

/**
 * Neo Brutalism Input Component
 *
 * Features:
 * - Label (required for accessibility)
 * - Error, success, and helper text states
 * - Left/right icons or text
 * - Character counter
 * - Keyboard accessible
 * - WCAG 2.1 AA compliant
 *
 * @example
 * ```tsx
 * <NBInput
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error="Email is required"
 * />
 *
 * <NBInput
 *   label="Price"
 *   type="number"
 *   leftText="Rp"
 *   rightText=".00"
 * />
 * ```
 */
export const NBInput = forwardRef<HTMLInputElement, NBInputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      leftText,
      rightText,
      showCounter,
      maxLength,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    // Determine border color based on state
    const borderColor = error
      ? 'border-nb-danger'
      : success
        ? 'border-nb-success'
        : 'border-nb-black focus:border-nb-primary';

    const hasLeftContent = leftIcon || leftText;
    const hasRightContent = rightIcon || rightText;

    return (
      <div className="space-y-1">
        {/* Label */}
        <label htmlFor={inputId} className="block text-sm font-semibold text-nb-black">
          {label}
          {props.required && <span className="text-nb-danger ml-1">*</span>}
        </label>

        {/* Input wrapper */}
        <div className="relative">
          {/* Left content */}
          {hasLeftContent && (
            <div className="absolute left-0 top-0 h-12 flex items-center pl-4 text-nb-gray-600 pointer-events-none">
              {leftIcon || <span className="font-medium">{leftText}</span>}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-12 bg-nb-white border-3 shadow-nb-sm',
              'font-medium placeholder:text-nb-gray-400',
              'disabled:bg-nb-gray-100 disabled:shadow-none disabled:cursor-not-allowed',
              hasLeftContent ? 'pl-12' : 'px-4',
              hasRightContent ? 'pr-12' : 'px-4',
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

          {/* Right content */}
          {hasRightContent && (
            <div className="absolute right-0 top-0 h-12 flex items-center pr-4 text-nb-gray-600 pointer-events-none">
              {rightIcon || <span className="font-medium">{rightText}</span>}
            </div>
          )}
        </div>

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

NBInput.displayName = 'NBInput';
