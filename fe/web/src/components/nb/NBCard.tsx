import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const cardVariants = cva('bg-nb-white', {
  variants: {
    variant: {
      elevated: 'border-3 border-nb-black shadow-nb-sm',
      outlined: 'border-3 border-nb-black shadow-none',
      filled: 'border-0 shadow-none bg-nb-gray-50',
    },
    interactive: {
      true: 'cursor-pointer transition-all duration-100 hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    interactive: false,
  },
});

export interface NBCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
}

/**
 * Neo Brutalism Card Component
 *
 * Features:
 * - 3 variants: elevated (with shadow), outlined (border only), filled (bg color)
 * - Optional header and footer sections
 * - Interactive mode for clickable cards
 * - Hover animation (shadow grows)
 *
 * @example
 * ```tsx
 * <NBCard variant="elevated">
 *   <NBCardHeader>Title</NBCardHeader>
 *   <NBCardContent>Content here</NBCardContent>
 *   <NBCardFooter>Footer actions</NBCardFooter>
 * </NBCard>
 *
 * <NBCard interactive onClick={handleClick}>
 *   Clickable card
 * </NBCard>
 * ```
 */
export const NBCard = forwardRef<HTMLDivElement, NBCardProps>(
  ({ className, variant, interactive, header, footer, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, interactive }), className)}
        {...props}
      >
        {header}
        {children}
        {footer}
      </div>
    );
  }
);

NBCard.displayName = 'NBCard';

/**
 * Card Header Section
 * Typically contains title and optional actions
 */
export const NBCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-b-2 border-nb-black p-4 font-bold', className)}
      {...props}
    />
  )
);

NBCardHeader.displayName = 'NBCardHeader';

/**
 * Card Content Section
 * Main content area of the card
 */
export const NBCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4', className)} {...props} />
  )
);

NBCardContent.displayName = 'NBCardContent';

/**
 * Card Footer Section
 * Typically contains action buttons
 */
export const NBCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t-2 border-nb-black p-4 flex gap-2', className)}
      {...props}
    />
  )
);

NBCardFooter.displayName = 'NBCardFooter';
