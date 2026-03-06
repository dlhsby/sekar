'use client';

/**
 * UserDetailPanel - Detailed view of a single user's current status
 * Shows shift info, location, activities, tasks, and contact links
 */

import { ArrowLeft, Clock, MapPin, Battery, CheckSquare, FileText } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime, formatDuration, formatTime } from '@/lib/utils/formatters';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/constants/monitoring';
import type { UserDaySummary } from '@/lib/api/monitoring';
import type { UserRole } from '@/types/models';

export interface UserDetailPanelProps {
  summary: UserDaySummary | undefined;
  isLoading: boolean;
  onBack: () => void;
  onViewLocationHistory: () => void;
}

const TASK_STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  pending: 'warning',
  in_progress: 'default',
  done: 'success',
  verified: 'success',
  rejected: 'destructive',
};

export function UserDetailPanel({
  summary,
  isLoading,
  onBack,
  onViewLocationHistory,
}: UserDetailPanelProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 w-32 bg-nb-gray-200 animate-pulse rounded" />
        <div className="h-20 bg-nb-gray-200 animate-pulse rounded" />
        <div className="h-32 bg-nb-gray-200 animate-pulse rounded" />
        <div className="h-24 bg-nb-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-nb-gray-600 hover:text-nb-black mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <p className="text-center text-nb-gray-500 mt-8">Data tidak tersedia</p>
      </div>
    );
  }

  const statusClass =
    STATUS_BADGE_CLASSES[summary.status] ?? 'bg-[var(--color-status-offline-bg)] text-[#374151] border-[var(--color-status-offline)]';
  const statusLabel = STATUS_LABELS[summary.status] ?? summary.status;
  const roleLabel = ROLE_LABELS[summary.role as UserRole] || summary.role;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 border-b border-nb-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-nb-gray-600 hover:text-nb-black transition-colors"
          aria-label="Kembali ke daftar"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* User header */}
        <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-nb-black text-lg leading-tight truncate">
                {summary.full_name}
              </h2>
              <p className="text-sm text-nb-gray-500 font-mono">@{summary.username}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-xs font-semibold bg-nb-gray-100 border border-nb-gray-300 px-2 py-0.5 rounded-nb-sm">
                  {roleLabel}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold border px-2 py-0.5 rounded-nb-sm',
                    statusClass
                  )}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Area / Rayon */}
          {(summary.area_name || summary.rayon_name) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-nb-gray-600">
              {summary.rayon_name && <span>Rayon: {summary.rayon_name}</span>}
              {summary.area_name && <span>Area: {summary.area_name}</span>}
            </div>
          )}
        </div>

        {/* Shift info */}
        {summary.shift && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Shift Hari Ini
            </h3>
            <p className="font-bold text-nb-black text-sm">{summary.shift.name}</p>
            <div className="mt-1 text-xs text-nb-gray-600 space-y-0.5">
              <div>
                Masuk: <span className="font-semibold">{formatTime(summary.shift.clock_in_time)}</span>
              </div>
              {summary.shift.clock_out_time && (
                <div>
                  Keluar:{' '}
                  <span className="font-semibold">{formatTime(summary.shift.clock_out_time)}</span>
                </div>
              )}
              <div>
                Durasi:{' '}
                <span className="font-semibold">{formatDuration(summary.shift.duration_minutes)}</span>
              </div>
              {summary.shift.outside_boundary && (
                <div className="text-[var(--color-status-outside)] font-semibold">Di luar batas area</div>
              )}
            </div>
          </div>
        )}

        {/* Last location */}
        {summary.last_location && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Lokasi Terakhir
            </h3>
            <div className="text-xs text-nb-gray-600 space-y-1">
              <div className="font-mono">
                {summary.last_location.latitude.toFixed(6)},{' '}
                {summary.last_location.longitude.toFixed(6)}
              </div>
              {summary.last_location.accuracy !== null && (
                <div>Akurasi: ±{summary.last_location.accuracy.toFixed(0)}m</div>
              )}
              {summary.last_location.battery_level !== null && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    summary.last_location.battery_level < 20 ? 'text-red-600 font-semibold' : ''
                  )}
                >
                  <Battery className="w-3 h-3" />
                  {summary.last_location.battery_level}%
                </div>
              )}
              <div className="text-nb-gray-400">
                {formatRelativeTime(summary.last_location.logged_at)}
              </div>
              <div
                className={
                  summary.last_location.is_within_area ? 'text-[var(--color-status-active)]' : 'text-[var(--color-status-outside)]'
                }
              >
                {summary.last_location.is_within_area ? 'Dalam area' : 'Di luar area'}
              </div>
            </div>
            <button
              type="button"
              onClick={onViewLocationHistory}
              className={cn(
                'mt-2 w-full text-xs font-semibold py-1.5 px-3 rounded-nb-base',
                'border-2 border-nb-black bg-nb-gray-100 hover:bg-nb-gray-200',
                'shadow-nb-xs hover:shadow-nb-sm transition-all duration-150'
              )}
            >
              Lihat Riwayat Lokasi
            </button>
          </div>
        )}

        {/* Activities today */}
        {summary.activities_today.length > 0 && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Aktivitas Hari Ini ({summary.activities_today.length})
            </h3>
            <ul className="space-y-1.5">
              {summary.activities_today.slice(0, 5).map((activity) => (
                <li key={activity.id} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-nb-primary flex-shrink-0" />
                  <span className="text-nb-black font-medium truncate">{activity.title}</span>
                  <span className="text-nb-gray-400 flex-shrink-0 ml-auto">
                    {new Date(activity.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tasks today */}
        {summary.tasks_today.length > 0 && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              Tugas Hari Ini ({summary.tasks_today.length})
            </h3>
            <ul className="space-y-1.5">
              {summary.tasks_today.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-nb-warning flex-shrink-0 mt-1" />
                  <span className="text-nb-black font-medium flex-1 min-w-0 truncate">
                    {task.title}
                  </span>
                  <Badge
                    variant={TASK_STATUS_VARIANT[task.status] ?? 'secondary'}
                    size="sm"
                    className="flex-shrink-0 text-[10px] px-1.5 py-0"
                  >
                    {task.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* WhatsApp / Call links */}
        {summary.whatsapp_links && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2">Hubungi</h3>
            <div className="flex gap-2">
              <a
                href={summary.whatsapp_links.chat}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 text-center text-xs font-bold py-2 px-3 rounded-nb-base',
                  'border-2 border-nb-black bg-green-400 text-green-900',
                  'shadow-nb-xs hover:shadow-nb-sm transition-all duration-150'
                )}
              >
                WhatsApp Chat
              </a>
              <a
                href={summary.whatsapp_links.call}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 text-center text-xs font-bold py-2 px-3 rounded-nb-base',
                  'border-2 border-nb-black bg-amber-400 text-amber-900',
                  'shadow-nb-xs hover:shadow-nb-sm transition-all duration-150'
                )}
              >
                Telepon
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
