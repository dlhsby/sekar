'use client';

import { HTMLAttributes } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { getBreadcrumbPath } from '@/lib/navigation';

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** Maximum number of segments to show before truncating */
  maxSegments?: number;
  /** Show home icon for root */
  showHomeIcon?: boolean;
}

/**
 * Breadcrumb Navigation Component
 * 
 * Features:
 * - Auto-generates breadcrumbs from current route
 * - Clickable path segments (except last)
 * - Home icon for root
 * - Chevron separators
 * - Max width with ellipsis for long paths
 * - Accessible (ARIA labels)
 * 
 * @example
 * ```tsx
 * // Auto-generates from current path
 * <Breadcrumb />
 * 
 * // With custom max segments
 * <Breadcrumb maxSegments={3} />
 * ```
 */
export function Breadcrumb({
  className,
  maxSegments = 4,
  showHomeIcon = true,
  ...props
}: BreadcrumbProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbPath(pathname);

  // Truncate if too many segments
  const displayBreadcrumbs = breadcrumbs.length > maxSegments
    ? [
        breadcrumbs[0],
        { label: '...', href: '' },
        ...breadcrumbs.slice(-(maxSegments - 2)),
      ]
    : breadcrumbs;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-2', className)}
      {...props}
    >
      <ol className="flex items-center space-x-2">
        {displayBreadcrumbs.map((crumb, index) => {
          const isLast = index === displayBreadcrumbs.length - 1;
          const isEllipsis = crumb.label === '...';
          const isHome = index === 0 && crumb.label.toLowerCase() === 'dashboard';

          return (
            <li key={crumb.href || index} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRightIcon
                  className="h-4 w-4 text-nb-gray-400 mx-2 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Breadcrumb item */}
              {isEllipsis ? (
                <span className="text-nb-gray-500 font-medium text-sm">...</span>
              ) : isLast ? (
                <span
                  className="text-nb-black font-bold text-sm truncate max-w-[200px]"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    'font-medium text-sm transition-colors duration-100',
                    'text-nb-gray-600 hover:text-nb-primary hover:underline',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-2 focus-visible:rounded-sm',
                    'inline-flex items-center gap-1.5'
                  )}
                >
                  {/* Home icon for first item */}
                  {showHomeIcon && isHome && (
                    <HomeIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate max-w-[200px]">{crumb.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
