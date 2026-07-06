import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import { SekarLogoBox } from './SekarLogoBox';

export interface BrandLockupProps {
  /** Pinwheel box size in px. Default 48. */
  size?: number;
  /** Small line under the wordmark. Pass null to hide. Default "DLH Surabaya". */
  subtitle?: string | null;
  className?: string;
}

/**
 * BrandLockup — the tilted-pinwheel box + "SEKAR" wordmark, used across the
 * auth surfaces (login brand panel + mobile header, forgot-password,
 * change-password). Single source so the lockup stays consistent.
 */
export function BrandLockup({
  size = 48,
  subtitle = 'DLH Surabaya',
  className,
}: BrandLockupProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <SekarLogoBox size={size} />
      <div className="leading-tight">
        <p className="font-heading text-2xl font-extrabold text-nb-black">SEKAR</p>
        {subtitle && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-nb-gray-700">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default BrandLockup;
