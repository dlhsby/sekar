'use client';

/**
 * UserDetailPanel - Detailed view of a single user's current status
 * Shows shift info, location, activities, tasks, and contact links
 */

import { useTranslation } from 'react-i18next';
import { intlLocale } from '@/lib/i18n/date-locale';
import { ArrowLeft, Clock, MapPin, Battery, CheckSquare, FileText } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime, formatDuration, formatTime } from '@/lib/utils/formatters';
import { STATUS_BADGE_CLASSES, getStatusLabels } from '@/lib/constants/monitoring';
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
  const { t } = useTranslation(['monitoring']);
  const statusLabels = getStatusLabels();

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
          {t('monitoring:userDetail.backButton')}
        </button>
        <p className="text-center text-nb-gray-500 mt-8">{t('monitoring:userDetail.noData')}</p>
      </div>
    );
  }

  const statusClass =
    STATUS_BADGE_CLASSES[summary.status] ??
    'bg-[var(--color-status-offline-bg)] text-[var(--color-status-offline)] border-[var(--color-status-offline)]';
  const statusLabel = statusLabels[summary.status] ?? summary.status;
  const roleLabel = ROLE_LABELS[summary.role as UserRole] || summary.role;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 border-b border-nb-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-nb-gray-600 hover:text-nb-black transition-colors"
          aria-label={t('monitoring:userDetail.backLabel')}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('monitoring:userDetail.backButton')}
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
                {/* Presence is two axes (ADR-050): the status pill above is the
                    live/activity axis; this is the inside/outside-area axis, shown
                    alongside it (matching mobile's worker detail) instead of buried
                    in the last-location block. */}
                {summary.last_location && (
                  <span
                    className={cn(
                      'text-xs font-semibold border px-2 py-0.5 rounded-nb-sm',
                      summary.last_location.is_within_area
                        ? 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border-[var(--color-status-active)]'
                        : 'bg-[var(--color-status-missing-bg)] text-[var(--color-status-missing)] border-[var(--color-status-missing)]'
                    )}
                  >
                    {summary.last_location.is_within_area
                      ? t('monitoring:userDetail.withinArea')
                      : t('monitoring:userDetail.outsideArea')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Area / Rayon */}
          {(summary.location_name || summary.district_name) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-nb-gray-600">
              {summary.district_name && <span>{t('monitoring:userDetail.districtLabel')} {summary.district_name}</span>}
              {summary.location_name && <span>{t('monitoring:userDetail.areaLabel')} {summary.location_name}</span>}
            </div>
          )}
        </div>

        {/* Shift info */}
        {summary.shift && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t('monitoring:userDetail.shiftTitle')}
            </h3>
            <p className="font-bold text-nb-black text-sm">{summary.shift.name}</p>
            <div className="mt-1 text-xs text-nb-gray-600 space-y-0.5">
              <div>
                {t('monitoring:userDetail.clockInLabel')}{' '}
                <span className="font-semibold">{formatTime(summary.shift.clock_in_time)}</span>
              </div>
              {summary.shift.clock_out_time && (
                <div>
                  {t('monitoring:userDetail.clockOutLabel')}{' '}
                  <span className="font-semibold">{formatTime(summary.shift.clock_out_time)}</span>
                </div>
              )}
              <div>
                {t('monitoring:userDetail.durationLabel')}{' '}
                <span className="font-semibold">
                  {formatDuration(summary.shift.duration_minutes)}
                </span>
              </div>
              {summary.shift.outside_boundary && (
                <div className="text-[var(--color-status-outside)] font-semibold">
                  {t('monitoring:userDetail.outsideBoundary')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last location */}
        {summary.last_location && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {t('monitoring:userDetail.locationTitle')}
            </h3>
            <div className="text-xs text-nb-gray-600 space-y-1">
              <div className="font-mono">
                {summary.last_location.latitude.toFixed(6)},{' '}
                {summary.last_location.longitude.toFixed(6)}
              </div>
              {summary.last_location.accuracy !== null && (
                <div>{t('monitoring:userDetail.accuracyLabel')} ±{summary.last_location.accuracy.toFixed(0)}m</div>
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
                  summary.last_location.is_within_area
                    ? 'text-[var(--color-status-active)]'
                    : 'text-[var(--color-status-outside)]'
                }
              >
                {summary.last_location.is_within_area ? t('monitoring:userDetail.withinArea') : t('monitoring:userDetail.outsideArea')}
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
              {t('monitoring:userDetail.viewLocationHistory')}
            </button>
          </div>
        )}

        {/* Activities today */}
        {summary.activities_today.length > 0 && (
          <div className="border-2 border-nb-black rounded-nb-base p-3 bg-white shadow-nb-sm">
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {t('monitoring:userDetail.activitiesTitle')} ({summary.activities_today.length})
            </h3>
            <ul className="space-y-1.5">
              {summary.activities_today.slice(0, 5).map((activity) => (
                <li key={activity.id} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-nb-primary flex-shrink-0" />
                  <span className="text-nb-black font-medium truncate">{activity.title}</span>
                  <span className="text-nb-gray-400 flex-shrink-0 ml-auto">
                    {new Date(activity.created_at).toLocaleTimeString(intlLocale(), {
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
              {t('monitoring:userDetail.tasksTitle')} ({summary.tasks_today.length})
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
            <h3 className="text-xs font-bold uppercase text-nb-gray-500 mb-2">{t('monitoring:userDetail.contactTitle')}</h3>
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
              >{t("common:pwa.whatsappChat")}</a>
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
                {t('monitoring:userDetail.phoneLabel')}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
