'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils/cn';

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'value'> {
  /** Completion 0–100 (clamped). */
  value?: number;
  /** Fill colour utility (e.g. `bg-nb-success`). Defaults to sage primary. */
  indicatorClassName?: string;
}

/** Progress — a determinate progress bar (Neo Brutalism). */
const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, indicatorClassName, ...props }, ref) => {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clamped}
      className={cn(
        'relative h-4 w-full overflow-hidden border-2 border-nb-black rounded-nb-base bg-nb-gray-100 shadow-nb-xs',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full bg-nb-primary transition-transform duration-300', indicatorClassName)}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = 'Progress';

export { Progress };
