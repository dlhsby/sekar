import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';

const badgeVariants = cva(
  'inline-flex items-center justify-center font-bold uppercase tracking-wide border-2',
  {
    variants: {
      variant: {
        primary: 'bg-nb-primary text-nb-white border-nb-black',
        success: 'bg-nb-success text-nb-white border-nb-black',
        warning: 'bg-nb-warning text-nb-white border-nb-black',
        danger: 'bg-nb-danger text-nb-white border-nb-black',
        neutral: 'bg-nb-gray-200 text-nb-black border-nb-black',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface NBBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show dot indicator instead of text */
  dot?: boolean;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Callback when badge is removed */
  onRemove?: () => void;
}

/**
 * Neo Brutalism Badge Component
 *
 * Features:
 * - 5 variants: primary, success, warning, danger, neutral
 * - 3 sizes: sm, md, lg
 * - Icon support
 * - Dot indicator mode
 * - Removable (close button)
 * - Accessible
 *
 * @example
 * ```tsx
 * <NBBadge variant="success">Active</NBBadge>
 * <NBBadge variant="warning" size="sm">Pending</NBBadge>
 * <NBBadge variant="primary" icon={<UserIcon />}>Admin</NBBadge>
 * <NBBadge variant="danger" onRemove={() => handleRemove()}>Tag</NBBadge>
 * <NBBadge dot variant="success">Online</NBBadge>
 * ```
 */
export const NBBadge = forwardRef<HTMLSpanElement, NBBadgeProps>(
  ({ className, variant, size, dot, icon, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {/* Dot indicator */}
        {dot && <span className="w-2 h-2 rounded-full bg-current mr-1.5" />}

        {/* Icon */}
        {!dot && icon && <span className="mr-1.5 inline-flex">{icon}</span>}

        {/* Content */}
        {children}

        {/* Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1.5 hover:opacity-70 transition-opacity inline-flex"
            aria-label="Remove"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }
);

NBBadge.displayName = 'NBBadge';
