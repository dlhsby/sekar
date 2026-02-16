import { Badge } from '@/components/ui';
import type { UserRole } from '@/types/models';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '@/lib/constants/roles';

interface RoleBadgeProps {
  role: UserRole;
}

/**
 * Role Badge Component
 * Displays user role with appropriate color variant
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={ROLE_BADGE_VARIANTS[role] ?? 'secondary'} size="sm">
      {ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
