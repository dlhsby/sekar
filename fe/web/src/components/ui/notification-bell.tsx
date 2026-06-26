'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/time';
import {
  useNotifications,
  useUnreadCount,
  type AppNotification,
} from '@/lib/api/notifications';

/**
 * NotificationPanel — the popover body listing the latest unread notifications.
 * Presentational; the bell owns data + navigation.
 */
export interface NotificationPanelProps {
  notifications: AppNotification[];
  isLoading: boolean;
  onSelect: (n: AppNotification) => void;
  onViewAll: () => void;
}

export function NotificationPanel({
  notifications,
  isLoading,
  onSelect,
  onViewAll,
}: NotificationPanelProps) {
  const recent = notifications.slice(0, 5);

  return (
    <div className="w-80 max-w-[calc(100vw_-_2rem)]">
      <div className="flex items-center justify-between border-b-2 border-nb-black px-4 py-3">
        <span className="text-nb-h3 text-nb-black">Notifikasi</span>
        {notifications.length > 0 && (
          <span className="font-mono text-nb-mono-sm text-nb-gray-600">
            {notifications.length} belum dibaca
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-nb-base bg-nb-gray-100" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="px-4 py-8 text-center text-nb-body-sm text-nb-gray-600">
          Tidak ada notifikasi baru.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {recent.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n)}
                className="flex w-full items-start gap-2.5 border-b border-nb-gray-200 px-4 py-3 text-left transition-colors hover:bg-nb-primary-soft"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-nb-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-nb-body-sm font-bold text-nb-black">
                    {n.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-nb-body-sm text-nb-gray-600">
                    {n.body}
                  </span>
                  <span className="mt-0.5 block font-mono text-nb-mono-sm text-nb-gray-500">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onViewAll}
        className="block w-full border-t-2 border-nb-black px-4 py-3 text-center font-heading text-sm font-bold text-nb-black transition-colors hover:bg-nb-gray-50"
      >
        Lihat Semua
      </button>
    </div>
  );
}

/**
 * NotificationBell — top-bar bell + unread badge + popover panel.
 *
 * Visual spec: web.md §D3. 32×32 container, Lucide Bell 20px, danger badge
 * ("9+" for ≥10, hidden at 0), active state when the panel is open. Lives in the
 * canvas top-bar (not the sidebar) so it stays visible at narrow widths.
 */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: unread = [], isLoading } = useNotifications({ is_read: false });

  const handleSelect = React.useCallback(
    (n: AppNotification) => {
      // The panel shows only a summary — open the detail page, which marks it
      // read and offers a CTA into the underlying entity.
      setOpen(false);
      router.push(`/notifications/${n.id}`);
    },
    [router]
  );

  const handleViewAll = React.useCallback(() => {
    setOpen(false);
    router.push('/notifications');
  }, [router]);

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
          className={cn(
            'relative inline-flex size-8 items-center justify-center rounded-nb-base border-2 transition-colors',
            'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-nb-primary focus-visible:outline-offset-2',
            open
              ? 'border-nb-black bg-nb-primary shadow-nb-xs'
              : 'border-transparent bg-transparent hover:border-nb-black hover:bg-nb-paper',
            className
          )}
        >
          <Bell className="size-5 text-nb-black" strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full border-[1.5px] border-nb-black bg-nb-danger font-mono text-[9px] font-bold leading-none text-nb-white"
              aria-hidden="true"
            >
              {badgeText}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 overflow-hidden rounded-nb-md border-2 border-nb-black bg-nb-white shadow-nb-lg focus:outline-none"
        >
          <NotificationPanel
            notifications={unread}
            isLoading={isLoading}
            onSelect={handleSelect}
            onViewAll={handleViewAll}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
