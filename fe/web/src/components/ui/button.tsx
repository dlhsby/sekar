'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn, nbFocusRing } from '@/lib/utils/cn';

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
   border-2 border-nb-black rounded-nb-base transition-all duration-100
   disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
   ${nbFocusRing}`,
  {
    variants: {
      variant: {
        default:
          'bg-nb-primary text-nb-white hover:bg-nb-primary-hover active:bg-nb-primary-active',
        secondary: 'bg-nb-white text-nb-black hover:bg-nb-gray-50',
        destructive: 'bg-nb-danger text-nb-white hover:opacity-90',
        success: 'bg-nb-success text-nb-white hover:opacity-90',
        warning: 'bg-nb-warning text-nb-black hover:opacity-90',
        outline: 'bg-transparent text-nb-black hover:bg-nb-gray-50',
        ghost: 'bg-transparent text-nb-primary border-transparent shadow-none hover:bg-nb-gray-50',
        link: 'text-nb-primary underline-offset-4 hover:underline border-transparent shadow-none',
      },
      size: {
        sm: 'h-10 px-4 text-sm min-w-[48px]',
        default: 'h-12 px-6 text-base min-w-[48px] min-h-[48px]',
        lg: 'h-14 px-8 text-lg min-w-[48px]',
        icon: 'h-12 w-12 min-w-[48px] min-h-[48px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isGhost = variant === 'ghost' || variant === 'link';

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          // Neo Brutalism shadow and press animation (not for ghost/link)
          !isGhost && [
            'shadow-nb-md',
            'hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
            'active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
          ],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
