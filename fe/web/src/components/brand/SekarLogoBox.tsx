import { cn } from '@/lib/utils/cn';
import { SekarMark } from './SekarMark';

export interface SekarLogoBoxProps {
  /** Box edge length in px (square). Default 40. */
  size?: number;
  /** Tilt in degrees for the dynamic 3D brand look. Default -6. */
  tilt?: number;
  className?: string;
}

/**
 * SekarLogoBox — the canonical SEKAR brand lockup: the pinwheel inside a white
 * Neo-Brutalist box (thick border + hard-edge offset shadow), tilted for a
 * dynamic 3D feel. Web mirror of mobile `SekarLogoBox`; on web the hard-edge
 * shadow is a real `box-shadow` (token `--shadow-nb-sm`), so no manual rect.
 */
export function SekarLogoBox({ size = 40, tilt = -6, className }: SekarLogoBoxProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-nb-md border-2 border-nb-black bg-nb-white shadow-nb-sm',
        className
      )}
      style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <SekarMark size={Math.round(size * 0.6)} />
    </span>
  );
}

export default SekarLogoBox;
