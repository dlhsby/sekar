'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

import { Button, EmptyState, PageHeader, SectionCard, SkeletonCard } from '@/components/ui';
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
const NOTIF_META: Record<NotificationType, NotifMeta> = {
  task_assigned: { label: 'Tugas baru', icon: ClipboardList, tone: 'info' },
  task_updated: { label: 'Tugas diperbarui', icon: ClipboardList, tone: 'info' },
  task_completed: { label: 'Tugas selesai', icon: CheckCircle2, tone: 'ok' },
  task_declined: { label: 'Tugas ditolak', icon: XCircle, tone: 'danger' },
  shift_reminder: { label: 'Pengingat jadwal', icon: CalendarClock, tone: 'warn' },
  report_submitted: { label: 'Laporan masuk', icon: FileText, tone: 'info' },
  announcement: { label: 'Pengumuman', icon: Megaphone, tone: 'warn' },
  system: { label: 'Sistem', icon: Settings2, tone: 'neutral' },
  activity_approved: { label: 'Aktivitas disetujui', icon: CheckCircle2, tone: 'ok' },
  activity_rejected: { label: 'Aktivitas ditolak', icon: XCircle, tone: 'danger' },
  activity_tagged: { label: 'Aktivitas ditandai', icon: Tag, tone: 'info' },
  overtime_approved: { label: 'Lembur disetujui', icon: CheckCircle2, tone: 'ok' },
  overtime_rejected: { label: 'Lembur ditolak', icon: XCircle, tone: 'danger' },
  missing_worker_alert: { label: 'Peringatan petugas hilang', icon: AlertTriangle, tone: 'danger' },
};

const TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-nb-success-light text-nb-success-dark',
  danger: 'bg-nb-danger-light text-nb-danger-dark',
  warn: 'bg-nb-warning-light text-nb-black',
  info: 'bg-nb-info-light text-nb-black',
  neutral: 'bg-nb-gray-100 text-nb-gray-700',
};

const FALLBACK_META: NotifMeta = { label: 'Notifikasi', icon: Settings2, tone: 'neutral' };

/** Indonesian CTA label derived from the deep-link destination. */
function ctaLabelFor(route: string): string {
  if (route.startsWith('/tasks')) return 'Buka tugas terkait';
  if (route.startsWith('/activities')) return 'Buka aktivitas terkait';
  if (route.startsWith('/overtime')) return 'Buka lembur terkait';
  if (route.startsWith('/pruning-requests')) return 'Buka permohonan terkait';
  if (route.startsWith('/monitoring')) return 'Buka monitoring';
  if (route.startsWith('/schedules')) return 'Buka jadwal';
  return 'Buka data terkait';
}

/**
 * Notification detail (web.md §D2). The bell + dashboard show only a summary;
 * tapping a notification lands here for the full message and a single CTA into
 * the underlying entity (tugas / lembur / aktivitas / …). The list endpoint is
 * not paginated, so the notification is resolved from the cached inbox list
 * (no dedicated single-GET endpoint exists). Opening marks it read.
 */
export default function NotificationDetailPage() {
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
        <PageHeader breadcrumb="Akun · Notifikasi" title="Notifikasi" />
        <SkeletonCard />
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="space-y-5">
        <PageHeader breadcrumb="Akun · Notifikasi" title="Notifikasi" />
        <EmptyState
          variant="noData"
          title="Notifikasi tidak ditemukan"
          description="Notifikasi ini mungkin sudah dihapus atau tidak tersedia."
          action={{ label: 'Kembali ke daftar', onClick: () => router.push('/notifications') }}
        />
      </div>
    );
  }

  const meta = NOTIF_META[notif.type] ?? FALLBACK_META;
  const Icon = meta.icon;
  const route = notificationToRoute(notif);

  return (
    <div className="space-y-5">
      <PageHeader breadcrumb="Akun · Notifikasi · Detail" title="Detail notifikasi" />

      <button
        type="button"
        onClick={() => router.push('/notifications')}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 transition-colors hover:text-nb-black"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke daftar
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
              {ctaLabelFor(route)}
            </Button>
          ) : (
            <p className="text-nb-body-sm text-nb-gray-500">
              Notifikasi ini tidak memiliki data terkait untuk dibuka.
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
