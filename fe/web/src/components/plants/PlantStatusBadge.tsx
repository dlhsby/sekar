'use client';

/**
 * PlantStatusBadge — maps AreaPlantStatus to Badge variant + localized label
 *
 * Status → variant mapping:
 * - ok → success (Terawat / Well-maintained)
 * - due_soon → warning (Segera / Due Soon)
 * - overdue → destructive (Terlambat / Overdue)
 * - unknown → secondary (Belum Ada Data / No Data)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { AreaPlantStatus } from '@/lib/api/plants';
import { cn } from '@/lib/utils/cn';

export interface PlantStatusBadgeProps {
  status: AreaPlantStatus;
  className?: string;
}

const STATUS_VARIANT_MAP: Record<
  AreaPlantStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
> = {
  ok: 'success',
  due_soon: 'warning',
  overdue: 'destructive',
  unknown: 'secondary',
};

export function PlantStatusBadge({ status, className }: PlantStatusBadgeProps) {
  const { t } = useTranslation(['plants']);
  const variant = STATUS_VARIANT_MAP[status];
  const label = t(`plants:statusBadge.${status}`);

  return (
    <Badge variant={variant} size="sm" className={cn('w-fit', className)}>
      {label}
    </Badge>
  );
}
