'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/models';
import { isHexColor, readableInk } from '@/lib/utils/color';

/**
 * RoleAvatar — web mirror of mobile common/RoleAvatar.
 *
 * Circular avatar tinted by the user's role accent (hi-fi `.av.<role>`), with
 * the profile photo when available, else the name initials. 2px black border,
 * Space-Grotesk initials.
 */

type RoleStyle = { bg: string; text: string };

// Maps each role to its accent background + readable text colour (hi-fi `.av`).
// Role backgrounds are FIXED across light/dark, so the initials must use the
// non-inverting `text-white`/`text-black` (NOT `text-nb-white`/`text-nb-black`,
// which invert in dark mode and would make the initials match the background).
const ROLE_STYLE: Record<UserRole, RoleStyle> = {
  satgas: { bg: 'bg-role-satgas', text: 'text-black' },
  linmas: { bg: 'bg-role-linmas', text: 'text-white' },
  korlap: { bg: 'bg-role-korlap', text: 'text-black' },
  admin_rayon: { bg: 'bg-role-admin-data', text: 'text-white' },
  kepala_rayon: { bg: 'bg-role-kepala', text: 'text-black' },
  management: { bg: 'bg-role-top', text: 'text-white' },
  admin_system: { bg: 'bg-role-admin-sys', text: 'text-white' },
  superadmin: { bg: 'bg-role-superadmin', text: 'text-white' },
  staff_kecamatan: { bg: 'bg-role-kecamatan', text: 'text-black' },
};

const SIZE: Record<NonNullable<RoleAvatarProps['size']>, string> = {
  sm: 'size-7 text-nb-mono-sm',
  md: 'size-9 text-nb-body-sm',
  lg: 'size-14 text-nb-h3',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface RoleAvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  name: string;
  role?: UserRole;
  /** Data-driven role accent (role `marker_color`); overrides the fixed token. */
  color?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const RoleAvatar = React.forwardRef<HTMLDivElement, RoleAvatarProps>(
  ({ name, role, color, src, size = 'md', className, style: styleProp, ...props }, ref) => {
    const tinted = isHexColor(color);
    const style = (role && ROLE_STYLE[role]) || { bg: 'bg-accent-mint', text: 'text-black' };

    return (
      <div
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-nb-black font-heading font-bold',
          SIZE[size],
          !tinted && style.bg,
          !tinted && style.text,
          className
        )}
        style={
          tinted ? { backgroundColor: color, color: readableInk(color), ...styleProp } : styleProp
        }
        aria-hidden="true"
        ref={ref}
        {...props}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="size-full rounded-full object-cover"
          />
        ) : (
          initials(name)
        )}
      </div>
    );
  }
);

RoleAvatar.displayName = 'RoleAvatar';

export { RoleAvatar };
