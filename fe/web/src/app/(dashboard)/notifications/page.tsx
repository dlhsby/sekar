'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';

import { Button, EmptyState, PageHeader, SkeletonList, Tabs, type TabItem } from '@/components/ui';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

type NotifCategory = 'all' | 'task' | 'activity' | 'overtime' | 'system';

const CATEGORY_TABS: TabItem<NotifCategory>[] = [
  { key: 'all', label: 'Semua' },
  { key: 'task', label: 'Tugas' },
  { key: 'activity', label: 'Aktivitas' },
  { key: 'overtime', label: 'Lembur' },
  { key: 'system', label: 'Sistem' },
];

/** Map a notification `type` to its filter category (mirrors mobile). */
function categoryOf(type: string): Exclude<NotifCategory, 'all'> {
  if (type.startsWith('task')) return 'task';
  if (type.startsWith('activity')) return 'activity';
  if (type.startsWith('overtime')) return 'overtime';
  return 'system';
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  const [category, setCategory] = useState<NotifCategory>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filtered = useMemo(
    () =>
      category === 'all'
        ? notifications
        : notifications.filter((n) => categoryOf(n.type) === category),
    [notifications, category]
  );

  const visible = filtered.slice(0, visibleCount);

  const handleCategory = (key: NotifCategory) => {
    setCategory(key);
    setVisibleCount(PAGE_SIZE);
  };

  const handleSelect = (n: AppNotification) => {
    // Open the detail page (summary → full message + CTA). Detail marks read.
    router.push(`/notifications/${n.id}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCheck className="size-4" />}
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Tandai semua dibaca
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={CATEGORY_TABS}
        value={category}
        onValueChange={handleCategory}
        aria-label="Filter notifikasi"
      />

      {isLoading ? (
        <SkeletonList items={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          variant="noData"
          title="Belum ada notifikasi"
          description="Notifikasi tugas, lembur, dan pengumuman akan muncul di sini."
        />
      ) : (
        <>
          <ul className="overflow-hidden rounded-nb-md border-2 border-nb-black bg-nb-white shadow-nb-sm">
            {visible.map((n) => (
              <li key={n.id} className="border-b border-nb-gray-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-nb-primary-soft',
                    !n.is_read && 'bg-nb-primary-soft/60'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.is_read ? 'bg-transparent' : 'bg-nb-primary'
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-nb-body-sm text-nb-black',
                        !n.is_read && 'font-bold'
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-nb-body-sm text-nb-gray-600">{n.body}</span>
                    <span className="mt-1 block font-mono text-[11px] text-nb-gray-600">
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length > visibleCount && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Muat lebih banyak
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
