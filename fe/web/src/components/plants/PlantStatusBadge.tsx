'use client';

/**
 * PlantStatusBadge — maps AreaPlantStatus to Badge variant + Indonesian label
 *
 * Status → variant mapping:
 * - ok → success (Terawat)
 * - due_soon → warning (Segera)
 * - overdue → destructive (Terlambat)
 * - unknown → secondary (Belum Ada Data)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { AreaPlantStatus } from '@/lib/api/plants';
import { cn } from '@/lib/utils/cn';

export interface PlantStatusBadgeProps {
  status: AreaPlantStatus;
  className?: string;
}

const STATUS_MAP: Record<
  AreaPlantStatus,
  { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'; label: string }
> = {
  ok: { variant: 'success', label: 'Terawat' },
  due_soon: { variant: 'warning', label: 'Segera' },
  overdue: { variant: 'destructive', label: 'Terlambat' },
  unknown: { variant: 'secondary', label: 'Belum Ada Data' },
};

export function PlantStatusBadge({ status, className }: PlantStatusBadgeProps) {
  const { variant, label } = STATUS_MAP[status];

  return (
    <Badge variant={variant} size="sm" className={cn('w-fit', className)}>
      {label}
    </Badge>
  );
}
