import type { AvailabilityStatus } from '@/lib/hooks/useAvailabilityCheck';

interface AvailabilityHintProps {
  status: AvailabilityStatus;
  /** Override the default Indonesian messages per state. */
  labels?: { checking?: string; available?: string; taken?: string; invalid?: string };
}

/**
 * Standard caption line for a {@link useAvailabilityCheck} status — used under
 * unique fields (username, phone, rayon name, …). Renders nothing when idle.
 */
export function AvailabilityHint({ status, labels }: AvailabilityHintProps) {
  if (status === 'checking') {
    return (
      <p className="text-nb-caption text-nb-gray-600">
        {labels?.checking ?? 'Memeriksa ketersediaan…'}
      </p>
    );
  }
  if (status === 'available') {
    return (
      <p className="text-nb-caption text-nb-success-dark">✓ {labels?.available ?? 'Tersedia'}</p>
    );
  }
  if (status === 'taken') {
    return (
      <p className="text-nb-caption text-nb-danger-dark">✗ {labels?.taken ?? 'Sudah dipakai'}</p>
    );
  }
  if (status === 'invalid') {
    return (
      <p className="text-nb-caption text-nb-danger-dark">
        {labels?.invalid ?? 'Format tidak valid'}
      </p>
    );
  }
  return null;
}
