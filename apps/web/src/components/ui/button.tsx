'use client';

import * as React from 'react';
import { createSlot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn, nbFocusRing } from '@/lib/utils/cn';

// The default `Slot` export types its props as generic `HTMLAttributes`, which
// omits `disabled` — create a button-typed instance so `asChild` can forward
// `disabled`/`aria-busy` onto the slotted child (e.g. a disabled-looking Link).
const ButtonSlot = createSlot<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  'Button'
);

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
   border-2 border-nb-black rounded-nb-base transition-all duration-100
   disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
   ${nbFocusRing}`,
  {
    variants: {
      variant: {
        // Ink-on-color text (WCAG AA): white on sage #7FBC8C is 2.21:1, ink is
        // 7.6:1 — same NB treatment the warning variant always had.
        default:
          'bg-nb-primary text-nb-ink hover:bg-nb-primary-hover active:bg-nb-primary-active',
        secondary: 'bg-nb-white text-nb-black hover:bg-nb-gray-50',
        destructive: 'bg-nb-danger text-nb-ink hover:opacity-90',
        success: 'bg-nb-success text-nb-ink hover:opacity-90',
        warning: 'bg-nb-warning text-nb-ink hover:opacity-90',
        outline: 'bg-transparent text-nb-black hover:bg-nb-gray-50',
        ghost: 'bg-transparent text-nb-black border-transparent shadow-none hover:bg-nb-gray-50',
        link: 'text-nb-success-dark underline-offset-4 hover:underline border-transparent shadow-none',
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
    const isGhost = variant === 'ghost' || variant === 'link';
    const buttonClassName = cn(
      buttonVariants({ variant, size }),
      // Neo Brutalism shadow and press animation (not for ghost/link)
      !isGhost && [
        'shadow-nb-md',
        'hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5',
        'active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
      ],
      fullWidth && 'w-full',
      className
    );
    const content = loading ? (
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
    );

    if (asChild) {
      // Radix Slot clones its single child and merges the button's own props
      // (className, disabled, aria-busy, ref) onto it — that child must be the
      // real target element (e.g. a <Link>), never a Fragment (Fragments only
      // accept `key`/`children`/`ref`). So inject the icon/loading content into
      // the child's OWN children instead of wrapping everything in a Fragment.
      const child = children as React.ReactElement<{ children?: React.ReactNode }>;
      return (
        <ButtonSlot
          className={buttonClassName}
          ref={ref}
          disabled={disabled || loading}
          aria-busy={loading}
          {...props}
        >
          {React.cloneElement(
            child,
            undefined,
            loading ? (
              <>
                <Loader2 className="animate-spin" />
                {child.props.children}
              </>
            ) : (
              <>
                {leftIcon}
                {child.props.children}
                {rightIcon}
              </>
            )
          )}
        </ButtonSlot>
      );
    }

    return (
      <button
        className={buttonClassName}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
