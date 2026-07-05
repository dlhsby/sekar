'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/utils/cn';

/** Separator — a 2px ink rule between sections (Neo Brutalism). */
const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-nb-black',
      orientation === 'horizontal' ? 'h-0.5 w-full' : 'h-full w-0.5',
      className
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';

export { Separator };
