'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, X, ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from './button';
import { SekarLogoBox } from '@/components/brand/SekarLogoBox';
import { BUILD_INFO, BUILD_LABEL } from '@/lib/build-info';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  children?: SidebarItem[];
  roles?: string[];
  /** Optional mono count badge shown on the right of the item. */
  count?: number;
  /** Renders as a plain anchor that opens in a new tab (e.g. external docs). */
  external?: boolean;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
  currentPath?: string;
  userRole?: string;
  logo?: React.ReactNode;
  title?: string;
  /** Optional small line under the wordmark. Omitted by default. */
  subtitle?: string;
}

const SidebarContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | null>(null);

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      items,
      isOpen = true,
      onClose,
      currentPath,
      userRole = '',
      logo,
      title = 'SEKAR',
      subtitle,
      ...props
    },
    ref
  ) => {
    const pathname = usePathname();
    const activePath = currentPath || pathname;
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

    // All navigable hrefs (parents + children), used to resolve the most
    // specific match so an index route (e.g. `/analytics`) isn't flagged
    // active when a deeper sibling (`/analytics/workers`) is the real match.
    const allHrefs = React.useMemo(() => {
      const hrefs: string[] = [];
      items.forEach((item) => {
        if (item.href && item.href !== '#' && !item.external) hrefs.push(item.href);
        item.children?.forEach((c) => {
          if (c.href && c.href !== '#' && !c.external) hrefs.push(c.href);
        });
      });
      return hrefs;
    }, [items]);

    const matchesPath = (href: string) =>
      activePath === href || !!activePath?.startsWith(href + '/');

    const isActive = (href?: string) => {
      if (!href || href === '#' || !matchesPath(href)) return false;
      // Active only if no deeper href also matches the current path.
      return !allHrefs.some((h) => h.startsWith(href + '/') && matchesPath(h));
    };

    const visible = (item: SidebarItem) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (item.roles.includes('*')) return true;
      return item.roles.includes(userRole);
    };

    const filteredItems = items.filter(visible);

    // Auto-expand any group whose child matches the active route.
    React.useEffect(() => {
      const toExpand: string[] = [];
      items.filter(visible).forEach((item) => {
        if (item.children?.some((c) => isActive(c.href))) toExpand.push(item.id);
      });
      if (toExpand.length > 0) {
        setExpandedItems((prev) => {
          const merged = [...new Set([...prev, ...toExpand])];
          return merged.length === prev.length ? prev : merged;
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePath, items, userRole]);

    const toggleExpanded = (id: string) =>
      setExpandedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const itemBase = (active: boolean, depth: number) =>
      cn(
        'flex items-center gap-2.5 rounded-[7px] border-[1.5px] px-2.5 py-2 text-nb-body-sm font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:-outline-offset-2',
        depth > 0 && 'pl-9',
        active
          ? 'border-nb-black bg-nb-primary text-nb-black shadow-[1.5px_1.5px_0_var(--color-nb-black)]'
          : 'border-transparent text-nb-gray-700 hover:bg-nb-paper hover:border-nb-black'
      );

    const countBadge = (count: number | undefined, active: boolean) =>
      typeof count === 'number' ? (
        <span
          className={cn(
            'ml-auto rounded-full px-1.5 font-mono text-[10px] leading-tight',
            active ? 'bg-nb-black text-nb-primary' : 'bg-nb-gray-100 text-nb-gray-500'
          )}
        >
          {count}
        </span>
      ) : null;

    const renderLink = (item: SidebarItem, depth = 0) => {
      const active = isActive(item.href);
      const content = (
        <>
          {item.icon && (
            <span className="inline-flex size-[18px] flex-shrink-0 items-center justify-center [&_svg]:size-[18px]">
              {item.icon}
            </span>
          )}
          <span className="flex-1 truncate">{item.label}</span>
          {item.external ? (
            <ExternalLink className="size-3.5 flex-shrink-0 text-nb-gray-400" aria-hidden="true" />
          ) : (
            countBadge(item.count, active)
          )}
        </>
      );

      // External links (e.g. the docs site) open in a new tab — never client-routed.
      if (item.external && item.href) {
        return (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={itemBase(false, depth)}
          >
            {content}
          </a>
        );
      }

      if (item.href && item.href !== '#') {
        return (
          <Link
            key={item.id}
            href={item.href}
            className={itemBase(active, depth)}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </Link>
        );
      }
      if (item.onClick) {
        return (
          <button key={item.id} type="button" onClick={item.onClick} className={cn(itemBase(active, depth), 'text-left')}>
            {content}
          </button>
        );
      }
      return (
        <div key={item.id} className={itemBase(active, depth)}>
          {content}
        </div>
      );
    };

    // A group with children renders a collapsible header + nested links.
    const renderNode = (item: SidebarItem) => {
      const children = item.children?.filter(visible);
      if (!children || children.length === 0) return renderLink(item);

      const expanded = expandedItems.includes(item.id);
      const hasActiveChild = children.some((c) => isActive(c.href));

      return (
        <div key={item.id} className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleExpanded(item.id)}
            aria-expanded={expanded}
            className={cn(itemBase(false, 0), 'w-full text-left', hasActiveChild && !expanded && 'text-nb-black')}
          >
            {item.icon && (
              <span className="inline-flex size-[18px] flex-shrink-0 items-center justify-center [&_svg]:size-[18px]">
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            <ChevronDown
              className={cn('size-4 flex-shrink-0 transition-transform duration-200', !expanded && '-rotate-90')}
              aria-hidden="true"
            />
          </button>
          {expanded && <div className="space-y-0.5">{children.map((c) => renderLink(c, 1))}</div>}
        </div>
      );
    };

    return (
      <>
        {/* Mobile overlay — only on small screens, only when open (no ghost). */}
        {isOpen && onClose && (
          <div
            className="fixed inset-0 z-30 bg-nb-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <aside
          ref={ref}
          className={cn(
            'flex w-64 flex-col border-r-2 border-nb-black bg-nb-white text-nb-black',
            'fixed inset-y-0 left-0 z-40 lg:static',
            'transition-transform duration-300 lg:translate-x-0',
            // Closed: slide off-canvas on mobile, remove from the desktop layout.
            !isOpen && 'max-lg:-translate-x-full lg:hidden',
            className
          )}
          {...props}
        >
          {/* Brand header — tilted white-card pinwheel + wordmark */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b-2 border-nb-black px-4 py-4">
            {logo || (
              <>
                <SekarLogoBox size={38} />
                <div className="min-w-0">
                  <p className="font-heading text-lg font-extrabold leading-none text-nb-black">
                    {title}
                  </p>
                  {subtitle && (
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-nb-gray-500">
                      {subtitle}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 space-y-0.5 overflow-y-auto p-3"
            role="navigation"
            aria-label="Navigasi utama"
          >
            {filteredItems.map(renderNode)}
          </nav>

          {/* Build identity — confirms which build is deployed. */}
          <div className="flex-shrink-0 border-t-2 border-nb-black/10 px-4 py-2">
            <span
              className="font-mono text-[10px] text-nb-gray-500"
              title={`Dibangun: ${BUILD_INFO.builtAt}`}
            >
              {BUILD_LABEL}
            </span>
          </div>

          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-3 top-3 border-transparent text-nb-black hover:bg-nb-paper lg:hidden"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </aside>
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => {
  const { setIsOpen, isOpen } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn('lg:hidden', className)}
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
      {...props}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </Button>
  );
});

SidebarTrigger.displayName = 'SidebarTrigger';

export { Sidebar, SidebarTrigger };
