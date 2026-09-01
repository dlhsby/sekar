'use client';

import { useTranslation } from 'react-i18next';
import type { AvailabilityStatus } from '@/lib/hooks/useAvailabilityCheck';

interface AvailabilityHintProps {
  status: AvailabilityStatus;
  /** Override the default messages per state. */
  labels?: { checking?: string; available?: string; taken?: string; invalid?: string };
}

/**
 * Standard caption line for a {@link useAvailabilityCheck} status — used under
 * unique fields (username, phone, district name, …). Renders nothing when idle.
 */
export function AvailabilityHint({ status, labels }: AvailabilityHintProps) {
  const { t } = useTranslation();

  if (status === 'checking') {
    return (
      <p className="text-nb-caption text-nb-gray-600">
        {labels?.checking ?? t('validation:checking')}
      </p>
    );
  }
  if (status === 'available') {
    return (
      <p className="text-nb-caption text-nb-success-dark">✓ {labels?.available ?? t('validation:available')}</p>
    );
  }
  if (status === 'taken') {
    return (
      <p className="text-nb-caption text-nb-danger-dark">✗ {labels?.taken ?? t('validation:taken')}</p>
    );
  }
  if (status === 'invalid') {
    return (
      <p className="text-nb-caption text-nb-danger-dark">
        {labels?.invalid ?? t('validation:formatInvalid')}
      </p>
    );
  }
  return null;
}
