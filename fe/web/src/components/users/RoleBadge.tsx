import { NBBadge } from '@/components/nb/NBBadge';
import { UserRole } from '@/types/models';

interface RoleBadgeProps {
  role: UserRole;
}

/**
 * Role Badge Component
 * Displays user role with appropriate color variant
 *
 * Color mapping:
 * - Admin: danger (red)
 * - TopManagement: primary (blue)
 * - KepalaRayon: warning (yellow)
 * - KoordinatorLapangan: success (green)
 * - Worker: neutral (gray)
 * - Linmas: neutral (gray)
 *
 * @example
 * ```tsx
 * <RoleBadge role="Admin" />
 * <RoleBadge role="Worker" />
 * ```
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  const variantMap: Record<UserRole, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
    Admin: 'danger',
    TopManagement: 'primary',
    KepalaRayon: 'warning',
    KoordinatorLapangan: 'success',
    Worker: 'neutral',
    Linmas: 'neutral',
  };

  const labelMap: Record<UserRole, string> = {
    Admin: 'Admin',
    TopManagement: 'Top Management',
    KepalaRayon: 'Kepala Rayon',
    KoordinatorLapangan: 'Koordinator Lapangan',
    Worker: 'Worker',
    Linmas: 'Linmas',
  };

  return (
    <NBBadge variant={variantMap[role]} size="sm">
      {labelMap[role]}
    </NBBadge>
  );
}
