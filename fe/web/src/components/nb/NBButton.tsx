'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, nbFocusRing } from '@/lib/utils/cn';

const buttonVariants = cva(
  `inline-flex items-center justify-center font-semibold border-3 border-nb-black
   transition-all duration-100 disabled:opacity-50 disabled:shadow-none
   disabled:cursor-not-allowed ${nbFocusRing}`,
  {
    variants: {
      variant: {
        primary:
          'bg-nb-primary text-nb-white hover:bg-nb-primary-hover active:bg-nb-primary-active',
        secondary: 'bg-nb-white text-nb-black hover:bg-nb-gray-50',
        danger: 'bg-nb-danger text-nb-white hover:opacity-90',
        ghost:
          'bg-transparent text-nb-primary border-none shadow-none hover:bg-nb-gray-50',
        text: 'bg-transparent text-nb-black border-none shadow-none hover:bg-nb-gray-50',
      },
      size: {
        sm: 'h-10 px-4 text-sm min-w-touch',
        md: 'h-12 px-6 text-base min-w-touch min-h-touch',
        lg: 'h-14 px-8 text-lg min-w-touch',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface NBButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner and disable button */
  loading?: boolean;
  /** Make button full width */
  fullWidth?: boolean;
  /** Icon to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right */
  rightIcon?: React.ReactNode;
}

/**
 * Neo Brutalism Button Component
 *
 * Features:
 * - 5 variants: primary, secondary, danger, ghost, text
 * - 3 sizes: sm, md, lg
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Full width option
 * - Press animation (shadow + transform)
 * - Accessible (keyboard navigation, focus indicators)
 *
 * @example
 * ```tsx
 * <NBButton variant="primary" size="md" onClick={handleClick}>
 *   Save Changes
 * </NBButton>
 *
 * <NBButton loading leftIcon={<PlusIcon />}>
 *   Add User
 * </NBButton>
 * ```
 */
export const NBButton = forwardRef<HTMLButtonElement, NBButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      fullWidth,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isGhost = variant === 'ghost' || variant === 'text';

    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          !isGhost &&
            'shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
          !isGhost &&
            'active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

NBButton.displayName = 'NBButton';
