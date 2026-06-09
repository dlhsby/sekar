'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, ClipboardPlus, UserPlus } from 'lucide-react';

import {
  KpiGrid,
  KpiTile,
  PageHeader,
  SectionCard,
  StatusPill,
  EmptyState,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { useMonitoringSnapshot } from '@/lib/api/monitoring-v2';
import { useTasks } from '@/lib/api/tasks';
import { usePruningRequests } from '@/lib/api/pruning-requests';
import { useOvertimes } from '@/lib/api/overtime';
import { useNotifications } from '@/lib/api/notifications';
import { notificationToRoute } from '@/lib/utils/notification-deep-links';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

const ADMIN_ROLES = new Set(['admin_system', 'superadmin']);

type StatusKey = 'active' | 'idle' | 'outside' | 'missing' | 'offline';

const STATUS_META: { key: StatusKey; label: string; color: string }[] = [
  { key: 'active', label: 'Aktif', color: 'var(--color-status-active)' },
  { key: 'idle', label: 'Tidak aktif', color: 'var(--color-status-idle)' },
  { key: 'outside', label: 'Di luar area', color: 'var(--color-status-outside)' },
  { key: 'missing', label: 'Hilang', color: 'var(--color-status-missing)' },
  { key: 'offline', label: 'Offline', color: 'var(--color-status-offline)' },
];

const NUM = '—';

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  const snapshot = useMonitoringSnapshot('city');
  const tasks = useTasks();
  const pruning = usePruningRequests({ status: 'submitted' });
  const overtime = useOvertimes({ status: 'pending' });
  const notifications = useNotifications();

  const counts = useMemo(() => {
    const d = snapshot.data?.data;
    if (!d) return null;
    return {
      active: d.total_active,
      idle: d.total_inactive,
      outside: d.total_outside_area,
      missing: d.total_missing,
      offline: d.total_offline,
      total:
        d.total_active +
        d.total_inactive +
        d.total_outside_area +
        d.total_missing +
        d.total_offline,
    };
  }, [snapshot.data]);

  // Per-rayon active/required, aggregated from area summaries.
  const perRayon = useMemo(() => {
    const summaries = snapshot.data?.data.area_summaries ?? [];
    const map = new Map<string, { active: number; required: number }>();
    for (const s of summaries) {
      const row = map.get(s.rayon_name) ?? { active: 0, required: 0 };
      row.active += s.active_count;
      row.required += s.required_count;
      map.set(s.rayon_name, row);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [snapshot.data]);

  // Conic-gradient string for the status donut.
  const donutGradient = useMemo(() => {
    if (!counts || counts.total === 0) return 'var(--color-nb-gray-200)';
    let acc = 0;
    const segments = STATUS_META.map(({ key, color }) => {
      const start = (acc / counts.total) * 100;
      acc += counts[key];
      const end = (acc / counts.total) * 100;
      return `${color} ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [counts]);

  const recent = (notifications.data ?? []).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Dashboard"
        title={`Halo, ${user?.full_name?.split(' ')[0] ?? 'Pengguna'}`}
        description={user ? ROLE_LABELS[user.role] || user.role : undefined}
        actions={
          snapshot.data ? (
            <StatusPill tone="ok" dot>
              Live · {formatRelativeTime(snapshot.data.data.generated_at)}
            </StatusPill>
          ) : undefined
        }
      />

      {/* KPI tiles */}
      <KpiGrid columns={4}>
        <KpiTile
          tone="white"
          label="Petugas aktif"
          value={counts ? `${counts.active} / ${counts.total}` : NUM}
        />
        <KpiTile
          tone="white"
          label="Tugas"
          value={tasks.data?.meta.total ?? NUM}
        />
        <KpiTile
          tone="yellow"
          label="Perantingan masuk"
          value={pruning.data?.meta.total ?? NUM}
        />
        <KpiTile
          tone="white"
          label="Lembur menunggu"
          value={overtime.data?.meta.total ?? NUM}
        />
      </KpiGrid>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Status breakdown */}
        <SectionCard
          title="Status petugas"
          meta={counts ? `${counts.total} total · ${perRayon.length} rayon` : undefined}
        >
          {!counts ? (
            <p className="py-6 text-center text-nb-body-sm text-nb-gray-600">
              {snapshot.isLoading ? 'Memuat status…' : 'Status tidak tersedia.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-6">
                <div
                  className="relative size-32 shrink-0 rounded-full border-2 border-nb-black"
                  style={{ background: donutGradient }}
                  role="img"
                  aria-label={`${counts.active} dari ${counts.total} petugas aktif`}
                >
                  <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border-2 border-nb-black bg-nb-white">
                    <span className="font-heading text-2xl font-extrabold leading-none text-nb-black">
                      {counts.active}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-nb-gray-600">Aktif</span>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {STATUS_META.map(({ key, label, color }) => {
                    const v = counts[key];
                    const pct = counts.total ? Math.round((v / counts.total) * 100) : 0;
                    return (
                      <li key={key} className="flex items-center gap-2 text-nb-body-sm">
                        <span
                          className="size-3 shrink-0 rounded-sm border border-nb-black"
                          style={{ background: color }}
                        />
                        <span className="flex-1 text-nb-gray-700">{label}</span>
                        <span className="font-mono text-[12px] font-bold text-nb-black">
                          {v} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {perRayon.length > 0 && (
                <>
                  <p className="mt-5 mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
                    Per rayon
                  </p>
                  <div className="space-y-1.5">
                    {perRayon.map((r) => {
                      const ratio = r.required ? r.active / r.required : 0;
                      const barColor =
                        ratio >= 0.75
                          ? 'var(--color-status-active)'
                          : ratio >= 0.5
                            ? 'var(--color-status-idle)'
                            : 'var(--color-status-missing)';
                      return (
                        <div key={r.name} className="flex items-center gap-3 text-nb-body-sm">
                          <span className="w-20 shrink-0 truncate text-nb-gray-700">{r.name}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full border border-nb-black bg-nb-gray-100">
                            <div
                              className="h-full"
                              style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right font-mono text-[11px] font-bold text-nb-black">
                            {r.active}/{r.required}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Quick actions + recent feed */}
        <div className="space-y-5">
          <SectionCard title="Tindakan cepat" tone="yellow">
            <div className="grid grid-cols-3 gap-2">
              <QuickAction href="/tasks/new" icon={<ClipboardPlus className="size-5" />} label="Tugas baru" />
              {isAdmin && (
                <QuickAction href="/users/new" icon={<UserPlus className="size-5" />} label="User baru" />
              )}
              <QuickAction href="/schedules/new" icon={<CalendarPlus className="size-5" />} label="Jadwal" />
            </div>
          </SectionCard>

          <SectionCard
            title="Notifikasi terkini"
            action={
              <Link
                href="/notifications"
                className="font-mono text-[11px] font-bold text-nb-black underline underline-offset-2"
              >
                Semua →
              </Link>
            }
            flush
          >
            {recent.length === 0 ? (
              <div className="p-4">
                <EmptyState variant="noData" size="sm" title="Belum ada notifikasi" />
              </div>
            ) : (
              <ul>
                {recent.map((n) => {
                  const route = notificationToRoute(n);
                  return (
                    <li key={n.id} className="border-b border-nb-gray-200 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => route && router.push(route)}
                        disabled={!route}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-4 py-2.5 text-left',
                          route && 'transition-colors hover:bg-nb-primary-soft'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            n.is_read ? 'bg-nb-gray-300' : 'bg-nb-primary'
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-nb-body-sm font-bold text-nb-black">
                            {n.title}
                          </span>
                          <span className="block truncate text-nb-body-sm text-nb-gray-600">
                            {n.body}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-nb-gray-500">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-nb-white px-2 py-3.5 text-center shadow-nb-xs transition-shadow hover:shadow-nb-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-nb-primary focus-visible:outline-offset-2"
    >
      <span className="text-nb-black">{icon}</span>
      <span className="text-nb-caption font-bold text-nb-black">{label}</span>
    </Link>
  );
}
