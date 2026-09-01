'use client';

import { Badge } from '@/components/ui';
import type { UserRole } from '@/types/models';
import { roleLabel, ROLE_BADGE_VARIANTS } from '@/lib/constants/roles';

interface RoleBadgeProps {
  /** Any role code — custom roles get the neutral variant + a title-cased label. */
  role: string;
}

/**
 * Role Badge Component
 * Displays user role with appropriate color variant
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={ROLE_BADGE_VARIANTS[role as UserRole] ?? 'secondary'} size="sm">
      {roleLabel(role)}
    </Badge>
  );
}
