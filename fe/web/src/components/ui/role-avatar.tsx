'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/models';

/**
 * RoleAvatar — web mirror of mobile common/RoleAvatar.
 *
 * Circular avatar tinted by the user's role accent (hi-fi `.av.<role>`), with
 * the profile photo when available, else the name initials. 2px black border,
 * Space-Grotesk initials.
 */

type RoleStyle = { bg: string; text: string };

// Maps each role to its accent background + readable text colour (hi-fi `.av`).
const ROLE_STYLE: Record<UserRole, RoleStyle> = {
  satgas: { bg: 'bg-role-satgas', text: 'text-nb-black' },
  linmas: { bg: 'bg-role-linmas', text: 'text-nb-white' },
  korlap: { bg: 'bg-role-korlap', text: 'text-nb-black' },
  admin_data: { bg: 'bg-role-admin-data', text: 'text-nb-white' },
  kepala_rayon: { bg: 'bg-role-kepala', text: 'text-nb-black' },
  top_management: { bg: 'bg-role-top', text: 'text-nb-white' },
  admin_system: { bg: 'bg-role-admin-sys', text: 'text-nb-white' },
  superadmin: { bg: 'bg-role-superadmin', text: 'text-nb-primary' },
  staff_kecamatan: { bg: 'bg-role-kecamatan', text: 'text-nb-black' },
};

const SIZE: Record<NonNullable<RoleAvatarProps['size']>, string> = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[13px]',
  lg: 'size-14 text-[18px]',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface RoleAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  role?: UserRole;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleAvatar({ name, role, src, size = 'md', className, ...props }: RoleAvatarProps) {
  const style = (role && ROLE_STYLE[role]) || { bg: 'bg-accent-mint', text: 'text-nb-black' };

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-nb-black font-heading font-bold',
        SIZE[size],
        style.bg,
        style.text,
        className
      )}
      aria-hidden="true"
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
