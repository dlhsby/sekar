'use client';

import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/models';
import { ROLE_LABELS } from '@/lib/constants/roles';

/** Role-accent pill colours (hi-fi USR-1 `.pill` per role). */
export const ROLE_PILL_STYLE: Record<UserRole, string> = {
  satgas: 'bg-role-satgas text-nb-black',
  linmas: 'bg-role-linmas text-nb-white',
  korlap: 'bg-role-korlap text-nb-black',
  admin_data: 'bg-role-admin-data text-nb-white',
  kepala_rayon: 'bg-role-kepala text-nb-black',
  top_management: 'bg-role-top text-nb-white',
  admin_system: 'bg-role-admin-sys text-nb-white',
  superadmin: 'bg-role-superadmin text-nb-white',
  staff_kecamatan: 'bg-role-kecamatan text-nb-black',
};

const base =
  'inline-flex items-center rounded-full border-[1.5px] border-nb-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide leading-none';

/** Static role-accent pill (table cells, detail headers). */
export function RolePill({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span className={cn(base, ROLE_PILL_STYLE[role], className)}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

/** Clickable role-accent chip used as a filter (USR-1 role-pill row). */
export function RolePillButton({
  role,
  active,
  onClick,
  children,
}: {
  role?: UserRole;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        'transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:outline-offset-1',
        role ? ROLE_PILL_STYLE[role] : 'bg-nb-black text-nb-white',
        // Muted via desaturation, not opacity — keeps text at WCAG AA contrast
        active ? 'shadow-nb-xs' : 'grayscale hover:grayscale-0'
      )}
    >
      {children}
    </button>
  );
}
