'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Sheet — a side panel (right drawer) built on Radix Dialog. Full-height, fixed
 * width, slides in from the right; header/footer fixed with a scrolling body.
 * Use for long, list-heavy surfaces (e.g. managing many entries) where a centered
 * modal would feel cramped.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-nb-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

/**
 * Sheet widths. `default` is the original `max-w-md` — every existing sheet keeps
 * exactly the width it had. `wide` exists for sheets holding a DATA TABLE
 * (ADR-054's Belum Dijadwalkan): name + role + rayon + action does not fit in
 * 448 px, and the whole point of a sheet over a modal is that the page behind it
 * stays readable, so it stops well short of full width.
 */
const SHEET_SIZE = {
  default: 'max-w-md',
  wide: 'max-w-3xl',
} as const;

export type SheetSize = keyof typeof SHEET_SIZE;

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: SheetSize }
>(({ className, children, size = 'default', ...props }, ref) => {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-full w-[calc(100%-2rem)] flex-col overflow-hidden border-l-2 border-nb-black bg-nb-white shadow-nb-lg',
          SHEET_SIZE[size],
          'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          className
        )}
        onInteractOutside={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-nb-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-2">
          <X className="h-5 w-5" />
          <span className="sr-only">{t('common:actions.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'z-10 flex shrink-0 flex-col space-y-1.5 border-b-2 border-nb-black bg-nb-white p-4 pr-12',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', className)} {...props} />
);
SheetBody.displayName = 'SheetBody';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'z-10 flex shrink-0 flex-col-reverse gap-2 border-t-2 border-nb-black bg-nb-white p-4 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-nb-h3 text-nb-black', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-nb-body-sm text-nb-gray-600', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
