'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn, nbFocusRing } from '@/lib/utils/cn';

/** Switch — Neo Brutalism on/off toggle (sage when on). */
const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border-2 border-nb-black rounded-full bg-nb-gray-200 shadow-nb-xs transition-colors',
      'data-[state=checked]:bg-nb-primary disabled:cursor-not-allowed disabled:opacity-50',
      nbFocusRing,
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 border-2 border-nb-black rounded-full bg-nb-white shadow-nb-xs transition-transform',
        'data-[state=checked]:translate-x-[1.25rem] data-[state=unchecked]:translate-x-0.5'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

export { Switch };
