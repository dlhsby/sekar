import { Badge } from '@/components/ui';
import { UserRole } from '@/types/models';

interface RoleBadgeProps {
  role: UserRole;
}

/**
 * Role Badge Component
 * Displays user role with appropriate color variant
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  const variantMap: Record<
    UserRole,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    admin: 'destructive',
    top_management: 'default',
    kepala_rayon: 'warning',
    koordinator_lapangan: 'success',
    worker: 'secondary',
    linmas: 'secondary',
  };

  const labelMap: Record<UserRole, string> = {
    admin: 'Admin',
    top_management: 'Top Management',
    kepala_rayon: 'Kepala Rayon',
    koordinator_lapangan: 'Koordinator Lapangan',
    worker: 'Worker',
    linmas: 'Linmas',
  };

  return (
    <Badge variant={variantMap[role]} size="sm">
      {labelMap[role]}
    </Badge>
  );
}
