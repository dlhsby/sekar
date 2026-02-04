'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from './button';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  children?: SidebarItem[];
  roles?: string[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  items: SidebarItem[];
  isOpen?: boolean;
  onClose?: () => void;
  currentPath?: string;
  userRole?: string;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  logo?: React.ReactNode;
  title?: string;
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
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
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
      user,
      logo,
      title = 'SEKAR',
      subtitle = 'Dashboard Admin',
      ...props
    },
    ref
  ) => {
    const pathname = usePathname();
    const activePath = currentPath || pathname;

    const filteredItems = items.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (item.roles.includes('*')) return true;
      return item.roles.includes(userRole);
    });

    const renderItem = (item: SidebarItem) => {
      const isActive =
        activePath === item.href || activePath?.startsWith(item.href + '/');

      const content = (
        <>
          {item.icon && (
            <span className="w-5 h-5 flex-shrink-0 inline-flex items-center justify-center [&_svg]:size-5">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </>
      );

      const baseClasses = cn(
        'flex items-center gap-3 px-4 py-3 font-medium transition-colors duration-100 w-full',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent active:bg-sidebar-accent/80'
      );

      if (item.href) {
        return (
          <Link key={item.id} href={item.href} className={baseClasses}>
            {content}
          </Link>
        );
      }

      if (item.onClick) {
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={cn(baseClasses, 'text-left')}
          >
            {content}
          </button>
        );
      }

      return (
        <div key={item.id} className={baseClasses}>
          {content}
        </div>
      );
    };

    return (
      <>
        {/* Mobile Overlay */}
        {isOpen && onClose && (
          <div
            className="fixed inset-0 bg-nb-black/50 z-30 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <aside
          ref={ref}
          className={cn(
            'w-64 bg-sidebar-background text-sidebar-foreground flex flex-col border-r-3 border-nb-black',
            'fixed lg:static inset-y-0 left-0 z-40',
            'transition-transform duration-300 lg:translate-x-0',
            !isOpen && '-translate-x-full',
            className
          )}
          {...props}
        >
          {/* Logo/Header */}
          <div className="p-6 border-b-2 border-sidebar-border flex-shrink-0">
            {logo || (
              <>
                <h1 className="text-2xl font-extrabold">{title}</h1>
                <p className="text-sidebar-foreground/60 text-sm mt-1">
                  {subtitle}
                </p>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 p-4 space-y-1 overflow-y-auto"
            role="navigation"
            aria-label="Main navigation"
          >
            {filteredItems.map((item) => renderItem(item))}
          </nav>

          {/* User info */}
          {user && (
            <div className="p-4 border-t-2 border-sidebar-border flex-shrink-0">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-sidebar-foreground"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-bold flex items-center justify-center border-2 border-sidebar-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{user.name}</p>
                  <p className="text-sidebar-foreground/80 text-xs truncate">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 text-sidebar-foreground hover:bg-sidebar-accent border-transparent"
              aria-label="Close sidebar"
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
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      {...props}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </Button>
  );
});

SidebarTrigger.displayName = 'SidebarTrigger';

export { Sidebar, SidebarTrigger };
