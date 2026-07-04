'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Megaphone,
  Settings2,
  Tag,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { Button, EmptyState, SectionCard, SkeletonCard } from '@/components/ui';
import {
  useNotifications,
  useMarkNotificationRead,
  type NotificationType,
} from '@/lib/api/notifications';
import { notificationToRoute } from '@/lib/utils/notification-deep-links';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

type Tone = 'ok' | 'danger' | 'warn' | 'info' | 'neutral';

interface NotifMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Per-type presentation (label + icon + accent), mirroring the mobile inbox. */
function getNotifMeta(t: ReturnType<typeof useTranslation>['t']): Record<NotificationType, NotifMeta> {
  return {
    task_assigned: { label: t('notifications:types.task_assigned'), icon: ClipboardList, tone: 'info' },
    task_updated: { label: t('notifications:types.task_updated'), icon: ClipboardList, tone: 'info' },
    task_completed: { label: t('notifications:types.task_completed'), icon: CheckCircle2, tone: 'ok' },
    task_declined: { label: t('notifications:types.task_declined'), icon: XCircle, tone: 'danger' },
    shift_reminder: { label: t('notifications:types.shift_reminder'), icon: CalendarClock, tone: 'warn' },
    report_submitted: { label: t('notifications:types.report_submitted'), icon: FileText, tone: 'info' },
    announcement: { label: t('notifications:types.announcement'), icon: Megaphone, tone: 'warn' },
    system: { label: t('notifications:types.system'), icon: Settings2, tone: 'neutral' },
    activity_approved: { label: t('notifications:types.activity_approved'), icon: CheckCircle2, tone: 'ok' },
    activity_rejected: { label: t('notifications:types.activity_rejected'), icon: XCircle, tone: 'danger' },
    activity_tagged: { label: t('notifications:types.activity_tagged'), icon: Tag, tone: 'info' },
    overtime_approved: { label: t('notifications:types.overtime_approved'), icon: CheckCircle2, tone: 'ok' },
    overtime_rejected: { label: t('notifications:types.overtime_rejected'), icon: XCircle, tone: 'danger' },
    missing_worker_alert: { label: t('notifications:types.missing_worker_alert'), icon: AlertTriangle, tone: 'danger' },
    area_plant_overdue: {
      label: t('notifications:types.area_plant_overdue'),
      icon: AlertTriangle,
      tone: 'danger',
    },
  };
}

const TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-nb-success-light text-nb-success-dark',
  danger: 'bg-nb-danger-light text-nb-danger-dark',
  warn: 'bg-nb-warning-light text-nb-black',
  info: 'bg-nb-info-light text-nb-black',
  neutral: 'bg-nb-gray-100 text-nb-gray-700',
};

function getFallbackMeta(t: ReturnType<typeof useTranslation>['t']): NotifMeta {
  return { label: t('notifications:detail.notFound'), icon: Settings2, tone: 'neutral' };
}

/** CTA label derived from the deep-link destination. */
function ctaLabelFor(route: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (route.startsWith('/tasks')) return t('notifications:cta.tasks');
  if (route.startsWith('/activities')) return t('notifications:cta.activities');
  if (route.startsWith('/overtime')) return t('notifications:cta.overtime');
  if (route.startsWith('/pruning-requests')) return t('notifications:cta.pruningRequests');
  if (route.startsWith('/monitoring')) return t('notifications:cta.monitoring');
  if (route.startsWith('/plants')) return t('notifications:cta.plants');
  if (route.startsWith('/schedules')) return t('notifications:cta.schedules');
  return t('notifications:cta.default');
}

/**
 * Notification detail (web.md §D2). The bell + dashboard show only a summary;
 * tapping a notification lands here for the full message and a single CTA into
 * the underlying entity (tugas / lembur / aktivitas / …). The list endpoint is
 * not paginated, so the notification is resolved from the cached inbox list
 * (no dedicated single-GET endpoint exists). Opening marks it read.
 */
export default function NotificationDetailPage() {
  const { t } = useTranslation(['notifications']);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const notif = useMemo(
    () => notifications.find((n) => n.id === id) ?? null,
    [notifications, id]
  );

  useEffect(() => {
    if (notif && !notif.is_read) markRead.mutate(notif.id);
    // Mark-read should fire once per notification, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notif?.id]);

  if (isLoading && !notif) {
    return (
      <div className="space-y-5">
        <SkeletonCard />
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="space-y-5">
        <EmptyState
          variant="noData"
          title={t('detail.notFound')}
          description={t('detail.notFoundDescription')}
          action={{ label: t('detail.backToList'), onClick: () => router.push('/notifications') }}
        />
      </div>
    );
  }

  const meta = getNotifMeta(t)[notif.type] ?? getFallbackMeta(t);
  const Icon = meta.icon;
  const route = notificationToRoute(notif);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push('/notifications')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t('detail.backToList')}
      </button>

      <SectionCard>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-nb-base border-2 border-nb-black',
              TONE_CHIP[meta.tone]
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
              {meta.label}
            </span>
            <h2 className="text-nb-h3 text-nb-black">{notif.title}</h2>
            <span className="mt-0.5 block font-mono text-[11px] text-nb-gray-500">
              {formatRelativeTime(notif.created_at)}
            </span>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-line text-nb-body text-nb-gray-800">{notif.body}</p>

        <div className="mt-5 border-t-2 border-nb-black pt-4">
          {route ? (
            <Button
              variant="default"
              rightIcon={<ArrowRight className="size-4" />}
              onClick={() => router.push(route)}
            >
              {ctaLabelFor(route, t)}
            </Button>
          ) : (
            <p className="text-nb-body-sm text-nb-gray-500">
              {t('detail.noRelatedData')}
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
