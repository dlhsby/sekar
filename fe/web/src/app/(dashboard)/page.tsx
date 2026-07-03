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
  EmptyState,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { useMonitoringSnapshot } from '@/lib/api/monitoring-v2';
import { useTasks } from '@/lib/api/tasks';
import { usePruningRequests } from '@/lib/api/pruning-requests';
import { useOvertimes } from '@/lib/api/overtime';
import { useNotifications } from '@/lib/api/notifications';
import { usePlantStatusSummary } from '@/lib/api/plants';
import { formatRelativeTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

const ADMIN_ROLES = new Set(['admin_system', 'superadmin', 'top_management']);

// Presence model mirrors the mobile monitoring map (StatusSummaryBar): the
// three activity states shown on the map are Aktif / Idle / Tidak terdeteksi.
// "Di luar area" is a location overlay (not a top-level status) and Offline
// (not clocked-in) is excluded from the map total — both surfaced separately.
type ActivityKey = 'aktif' | 'idle' | 'tidak_terdeteksi';

const ACTIVITY_META: { key: ActivityKey; label: string; color: string }[] = [
  { key: 'aktif', label: 'Aktif', color: 'var(--color-status-active)' },
  { key: 'idle', label: 'Idle', color: 'var(--color-status-idle)' },
  { key: 'tidak_terdeteksi', label: 'Tidak terdeteksi', color: 'var(--color-status-missing)' },
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
  const plantSummary = usePlantStatusSummary();

  // Rayons that currently have overdue plant maintenance (Phase 3-8 widget)
  const overdueRayons = useMemo(
    () => (plantSummary.data?.rayons ?? []).filter((r) => r.overdue > 0),
    [plantSummary.data]
  );
  const totalOverduePlants = useMemo(
    () => overdueRayons.reduce((sum, r) => sum + r.overdue, 0),
    [overdueRayons]
  );

  const counts = useMemo(() => {
    const d = snapshot.data?.data;
    if (!d) return null;
    // Workers clocked-in and pinging — incl. those currently outside their
    // boundary — count as "Aktif" (mobile folds outside-area into the activity
    // axis); the outside subset is surfaced on its own line.
    const aktif = (d.total_active ?? 0) + (d.total_outside_area ?? 0);
    const idle = d.total_inactive ?? 0;
    const tidak_terdeteksi = d.total_missing ?? 0;
    return {
      aktif,
      idle,
      tidak_terdeteksi,
      offline: d.total_offline ?? 0,
      di_luar_area: d.total_outside_area ?? 0,
      // Map total excludes offline (not clocked-in), matching mobile.
      presensi: aktif + idle + tidak_terdeteksi,
      // Roster-derived "expected vs actual" for today (ADR-013).
      expected: d.expected_count ?? 0,
      hadir: d.present_count ?? 0,
      tidak_hadir: d.absent_count ?? 0,
      cuti: d.on_leave_count ?? 0,
    };
  }, [snapshot.data]);

  // Per-rayon active/required, aggregated from area summaries.
  const perRayon = useMemo(() => {
    const summaries = snapshot.data?.data.area_summaries ?? [];
    const map = new Map<string, { active: number; required: number }>();
    for (const s of summaries) {
      if (!s.rayon_name) continue;
      const row = map.get(s.rayon_name) ?? { active: 0, required: 0 };
      row.active += s.active_count ?? 0;
      row.required += s.required_count ?? 0;
      map.set(s.rayon_name, row);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [snapshot.data]);

  // Conic-gradient string for the status donut.
  const donutGradient = useMemo(() => {
    if (!counts || counts.presensi === 0) return 'var(--color-nb-gray-200)';
    let acc = 0;
    const segments = ACTIVITY_META.map(({ key, color }) => {
      const start = (acc / counts.presensi) * 100;
      acc += counts[key];
      const end = (acc / counts.presensi) * 100;
      return `${color} ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [counts]);

  const recent = (notifications.data ?? []).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Halo, ${user?.full_name?.split(' ')[0] ?? 'Pengguna'}`}
        description={user ? ROLE_LABELS[user.role] || user.role : undefined}
      />

      {/* KPI tiles */}
      <KpiGrid columns={4}>
        <KpiTile
          tone="white"
          label="Petugas aktif"
          value={counts ? `${counts.aktif} / ${counts.presensi}` : NUM}
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
          meta={counts ? `${counts.presensi} hadir · ${perRayon.length} rayon` : undefined}
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
                  aria-label={`${counts.aktif} dari ${counts.presensi} petugas aktif`}
                >
                  <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border-2 border-nb-black bg-nb-white">
                    <span className="font-heading text-2xl font-extrabold leading-none text-nb-black">
                      {counts.aktif}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-nb-gray-600">Aktif</span>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {ACTIVITY_META.map(({ key, label, color }) => {
                    const v = counts[key];
                    const pct = counts.presensi ? Math.round((v / counts.presensi) * 100) : 0;
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
                  {/* Location overlay + not-clocked-in — shown apart from the
                      three activity states, mirroring the mobile map. */}
                  <li className="flex items-center gap-2 border-t border-nb-gray-200 pt-1.5 text-nb-body-sm">
                    <span
                      className="size-3 shrink-0 rounded-sm border border-nb-black"
                      style={{ background: 'var(--color-status-outside)' }}
                    />
                    <span className="flex-1 text-nb-gray-700">Di luar area</span>
                    <span className="font-mono text-[12px] font-bold text-nb-black">
                      {counts.di_luar_area}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-nb-body-sm">
                    <span
                      className="size-3 shrink-0 rounded-sm border border-nb-black"
                      style={{ background: 'var(--color-status-offline)' }}
                    />
                    <span className="flex-1 text-nb-gray-500">Offline (belum clock-in)</span>
                    <span className="font-mono text-[12px] font-bold text-nb-gray-500">
                      {counts.offline}
                    </span>
                  </li>
                </ul>
              </div>

              {counts.expected > 0 && (
                <div className="mt-5 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
                    Jadwal hari ini · {counts.expected} dijadwalkan
                  </p>
                  <div className="flex flex-wrap gap-4 text-nb-body-sm">
                    <span className="text-nb-gray-700">
                      Hadir{' '}
                      <strong className="font-mono text-nb-success-dark">{counts.hadir}</strong>
                    </span>
                    <span className="text-nb-gray-700">
                      Tidak hadir{' '}
                      <strong className="font-mono text-nb-danger-dark">{counts.tidak_hadir}</strong>
                    </span>
                    <span className="text-nb-gray-700">
                      Cuti <strong className="font-mono text-nb-warning">{counts.cuti}</strong>
                    </span>
                  </div>
                </div>
              )}

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
                <QuickAction href="/users" icon={<UserPlus className="size-5" />} label="User baru" />
              )}
              <QuickAction href="/schedules" icon={<CalendarPlus className="size-5" />} label="Jadwal" />
            </div>
          </SectionCard>

          {/* Phase 3-8 close-out: plant maintenance overdue widget */}
          <SectionCard
            title="Tanaman Terlambat Dipangkas"
            action={
              <Link
                href="/plants"
                className="font-mono text-[11px] font-bold text-nb-black underline underline-offset-2"
              >
                Tanaman →
              </Link>
            }
          >
            {plantSummary.isLoading ? (
              <p className="text-nb-body-sm text-nb-gray-500">Memuat…</p>
            ) : overdueRayons.length === 0 ? (
              <p className="text-nb-body-sm text-nb-gray-600">
                Semua tanaman terpangkas sesuai jadwal. 🌿
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-nb-body-sm text-nb-gray-700">
                  <span className="font-bold text-nb-danger-dark">{totalOverduePlants}</span> jenis
                  tanaman melewati jadwal di {overdueRayons.length} rayon
                </p>
                <ul className="space-y-1.5">
                  {overdueRayons.map((r) => (
                    <li
                      key={r.rayon_id ?? 'none'}
                      className="flex items-center justify-between gap-2 text-nb-body-sm"
                    >
                      <span className="min-w-0 truncate text-nb-gray-700">
                        {r.rayon_name ?? 'Tanpa rayon'}
                        {r.overdue_areas[0] && (
                          <span className="text-nb-gray-500"> · {r.overdue_areas[0].area_name}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-nb-sm border border-nb-danger bg-nb-danger-light/30 px-1.5 py-0.5 font-mono text-[11px] font-bold text-nb-danger-dark">
                        {r.overdue}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                  return (
                    <li key={n.id} className="border-b border-nb-gray-200 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/notifications/${n.id}`)}
                        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-nb-primary-soft"
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
