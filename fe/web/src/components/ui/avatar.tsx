'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden border-2 border-nb-black rounded-full bg-nb-gray-100 font-bold uppercase text-nb-black',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-14 w-14 text-base',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

/** Derive up-to-two-letter initials from a display name. */
function initialsOf(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /** Display name — drives the initials fallback. */
  name?: string;
  /** Image URL; falls back to initials on missing/error. */
  src?: string | null;
  alt?: string;
}

/**
 * Avatar — generic (role-agnostic) avatar with an initials fallback. For the
 * role-tinted variant used in worker lists, use `RoleAvatar`.
 */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, name, src, alt, ...props }, ref) => {
    const [errored, setErrored] = React.useState(false);
    const showImage = Boolean(src) && !errored;
    return (
      <span ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote S3/MinIO URLs; next/image needs domain config
          <img
            src={src as string}
            alt={alt ?? name ?? ''}
            className="h-full w-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <span aria-hidden>{initialsOf(name)}</span>
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cap visible avatars; the remainder collapses into a +N chip. */
  max?: number;
}

/** AvatarGroup — overlapping avatars with an optional +N overflow chip. */
const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max, children, ...props }, ref) => {
    const items = React.Children.toArray(children);
    const visible = max != null ? items.slice(0, max) : items;
    const overflow = items.length - visible.length;
    return (
      <div ref={ref} className={cn('flex items-center -space-x-2', className)} {...props}>
        {visible}
        {overflow > 0 ? (
          <span
            className={cn(
              avatarVariants({ size: 'default' }),
              'bg-nb-gray-200 text-nb-body-sm'
            )}
            aria-label={`${overflow} lainnya`}
          >
            +{overflow}
          </span>
        ) : null}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, avatarVariants };
