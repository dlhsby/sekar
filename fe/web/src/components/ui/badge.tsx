'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 border-2 border-nb-black rounded-nb-sm shadow-nb-xs font-semibold uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-nb-primary text-nb-white',
        secondary: 'bg-nb-gray-100 text-nb-black',
        destructive: 'bg-nb-danger text-nb-white',
        success: 'bg-nb-success text-nb-white',
        warning: 'bg-nb-warning text-nb-black',
        outline: 'bg-transparent text-nb-black',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  onRemove?: () => void;
}

function Badge({ className, variant, size, icon, onRemove, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="[&_svg]:size-3">{icon}</span>}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
