'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const skeletonVariants = cva(
  'bg-nb-gray-300 border-2 border-nb-black rounded-nb-sm shadow-nb-xs animate-shimmer',
  {
    variants: {
      variant: {
        text: 'h-4 w-4/5',
        heading: 'h-8 w-3/5',
        card: 'h-32 w-full',
        avatar: 'h-12 w-12',
        button: 'h-12 w-24',
        listItem: 'h-16 w-full',
        thumbnail: 'h-20 w-20',
        paragraph: 'h-20 w-full',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /**
   * Number of skeleton items to render
   */
  count?: number;
  /**
   * Gap between skeleton items (Tailwind spacing)
   */
  gap?: 'sm' | 'md' | 'lg';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, count = 1, gap = 'md', ...props }, ref) => {
    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    };

    if (count > 1) {
      return (
        <div ref={ref} className={cn('flex flex-col', gapClasses[gap])}>
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className={cn(skeletonVariants({ variant }), className)}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        aria-label="Memuat..."
        role="status"
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

/**
 * Card skeleton for loading card content
 */
const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-2 border-nb-black rounded-nb-base bg-nb-white shadow-nb-sm p-4 space-y-4',
      className
    )}
    aria-label="Memuat kartu..."
    role="status"
    {...props}
  >
    <Skeleton variant="heading" />
    <Skeleton variant="text" />
    <Skeleton variant="text" className="w-3/4" />
    <div className="flex gap-2 pt-2">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

/**
 * Table skeleton for loading table content
 */
const SkeletonTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { rows?: number }
>(({ className, rows = 5, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-2 border-nb-black rounded-nb-base overflow-hidden', className)}
    aria-label="Memuat tabel..."
    role="status"
    {...props}
  >
    {/* Header */}
    <div className="bg-nb-gray-100 p-4 border-b-2 border-nb-black flex gap-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="p-4 border-b-2 border-nb-gray-200 last:border-b-0 flex gap-4"
      >
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </div>
));
SkeletonTable.displayName = 'SkeletonTable';

/**
 * List skeleton for loading list content
 */
const SkeletonList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { items?: number }
>(({ className, items = 5, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-3', className)}
    aria-label="Memuat daftar..."
    role="status"
    {...props}
  >
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className="border-2 border-nb-black rounded-nb-base bg-nb-white p-4 flex items-center gap-4"
      >
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
    ))}
  </div>
));
SkeletonList.displayName = 'SkeletonList';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, skeletonVariants };
