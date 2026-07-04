'use client';

/**
 * LocationTimeline - Location history timeline view in the side panel
 * Shows date picker, summary stats, and scrollable point list with interactive selection
 */

import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Clock, Navigation, Eye } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { DatePicker, Checkbox } from '@/components/ui';
import {
  formatMinutes,
  formatDistance,
  formatTimeWithSeconds,
  formatTime,
  todayJakartaISODate,
} from '@/lib/utils/formatters';
import type { LocationHistory } from '@/lib/api/monitoring';

export interface LocationTimelineProps {
  history: LocationHistory | undefined;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
  userName: string;
  selectedPointIndex?: number | null;
  onPointSelect?: (index: number) => void;
  showOnlyThisUser?: boolean;
  onToggleShowOnly?: (show: boolean) => void;
}

export function LocationTimeline({
  history,
  isLoading,
  selectedDate,
  onDateChange,
  onBack,
  userName,
  selectedPointIndex,
  onPointSelect,
  showOnlyThisUser,
  onToggleShowOnly,
}: LocationTimelineProps) {
  const { t } = useTranslation(['monitoring']);
  const todayStr = todayJakartaISODate();
  const pointRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (selectedPointIndex == null) return;
    const el = pointRefs.current[selectedPointIndex];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPointIndex]);

  const lastIndex = history ? history.points.length - 1 : -1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 border-b border-nb-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-nb-gray-600 hover:text-nb-black transition-colors mb-2"
          aria-label={t('monitoring:timeline.backLabel')}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('monitoring:timeline.backButton')}
        </button>
        <h3 className="font-black text-nb-black text-sm truncate">{userName}</h3>
        <p className="text-xs text-nb-gray-500">{t('monitoring:timeline.title')}</p>
      </div>

      {/* Date picker */}
      <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200">
        <label className="text-xs font-bold text-nb-gray-600 mb-1 block">
          {t('monitoring:timeline.datePickerLabel')}
        </label>
        <DatePicker
          value={selectedDate || undefined}
          onValueChange={(v) => onDateChange(v ?? '')}
        />
      </div>

      {/* Summary stats */}
      {history && !isLoading && (
        <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200 bg-nb-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-nb-gray-500 font-semibold">{t('monitoring:timeline.distance')}</div>
              <div className="text-sm font-black">
                {formatDistance(history.total_distance_meters)}
              </div>
            </div>
            <div className="bg-white border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-nb-gray-500 font-semibold">{t('monitoring:timeline.points')}</div>
              <div className="text-sm font-black">{history.total_points}</div>
            </div>
            <div className="bg-[var(--color-status-active-bg)] border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-[var(--color-status-active)] font-semibold">{t('monitoring:timeline.withinArea')}</div>
              <div className="text-sm font-black text-[var(--color-status-active)]">
                {formatMinutes(history.time_inside_area_minutes)}
              </div>
            </div>
            <div className="bg-[var(--color-status-outside-bg)] border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-[var(--color-status-outside)] font-semibold">{t('monitoring:timeline.outsideArea')}</div>
              <div className="text-sm font-black text-[var(--color-status-outside)]">
                {formatMinutes(history.time_outside_area_minutes)}
              </div>
            </div>
          </div>

          {/* Shift info */}
          {history.shift_name && (
            <div className="mt-2 text-xs text-nb-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('monitoring:timeline.shift')} <span className="font-semibold">{history.shift_name}</span>
              {history.clock_in_time && (
                <span className="ml-1">
                  · {t('monitoring:timeline.clockIn')} {formatTimeWithSeconds(history.clock_in_time)}
                </span>
              )}
            </div>
          )}

          {/* Summary info bar */}
          <div className="mt-2 px-2 py-1.5 bg-white border border-nb-gray-200 rounded-nb-sm text-[10px] text-nb-gray-600 leading-relaxed">
            <span className="font-semibold text-nb-black">{userName}</span>
            {' · '}
            {selectedDate}
            {' · '}
            {formatDistance(history.total_distance_meters)}
            {' · ' + t('monitoring:timeline.withinArea')} {' '}
            {formatMinutes(history.time_inside_area_minutes)}
            {' / ' + t('monitoring:timeline.outsideArea').toLowerCase() + ' '}
            {formatMinutes(history.time_outside_area_minutes)}
          </div>

          {/* Hide-others toggle */}
          {onToggleShowOnly && (
            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                checked={showOnlyThisUser ?? false}
                onChange={(e) => onToggleShowOnly(e.target.checked)}
              />
              <Eye className="w-3 h-3 text-nb-gray-500" aria-hidden="true" />
              <span className="text-xs text-nb-gray-600">{t('monitoring:timeline.showOnlyThisUser')}</span>
            </div>
          )}
        </div>
      )}

      {/* Points list */}
      <div className="flex-1 overflow-y-auto" aria-label={t('monitoring:timeline.pointsListLabel')}>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-nb-gray-200 animate-pulse rounded" />
            ))}
          </div>
        ) : !history ? (
          <div className="p-6 text-center text-nb-gray-500">
            <Navigation className="w-8 h-8 mx-auto mb-2 text-nb-gray-300" />
            <p className="text-sm font-semibold">{t('monitoring:timeline.noHistory')}</p>
            <p className="text-xs mt-1">{t('monitoring:timeline.noHistoryHelper')}</p>
          </div>
        ) : history.points.length === 0 ? (
          <div className="p-6 text-center text-nb-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-nb-gray-300" />
            <p className="text-sm font-semibold">{t('monitoring:timeline.noPoints')}</p>
            <p className="text-xs mt-1">{t('monitoring:timeline.noPointsHelper')}</p>
          </div>
        ) : (
          <ol className="relative" aria-label={t('monitoring:timeline.pointsLabel', { count: history.total_points })}>
            {history.points.map((point, index) => {
              const isSelected = selectedPointIndex === index;
              const isFirst = index === 0;
              const isLast = index === lastIndex;

              return (
                <li
                  key={`${point.logged_at}-${index}`}
                  role="listitem"
                  ref={(el) => {
                    pointRefs.current[index] = el;
                  }}
                  className={cn(
                    'border-b border-nb-gray-100 transition-colors',
                    isSelected ? 'border-l-4 border-l-blue-500 bg-blue-50' : 'hover:bg-nb-gray-50'
                  )}
                >
                  <button
                    type="button"
                    className="w-full flex items-start gap-2 px-3 py-2 text-left"
                    onClick={() => onPointSelect?.(index)}
                    aria-pressed={isSelected}
                    aria-label={t('monitoring:map.locationPointAriaLabel', { index: index + 1, time: formatTimeWithSeconds(point.logged_at) })}
                  >
                    {/* Color indicator */}
                    <span
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 border border-white shadow-nb-xs',
                        point.is_within_area
                          ? 'bg-[var(--color-status-active)]'
                          : 'bg-[var(--color-status-outside)]'
                      )}
                      aria-hidden="true"
                    />

                    {/* Point info */}
                    <div className="flex-1 min-w-0">
                      {/* First/Last markers */}
                      {(isFirst || isLast) && (
                        <div className="mb-0.5">
                          {isFirst && (
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-400 mr-1">
                              {t('monitoring:timeline.start')} {formatTime(point.logged_at)}
                            </span>
                          )}
                          {isLast && !isFirst && (
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-400 mr-1">
                              {t('monitoring:timeline.end')} {formatTime(point.logged_at)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-nb-black">
                          {formatTimeWithSeconds(point.logged_at)}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                            point.is_within_area
                              ? 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active)] border-[var(--color-status-active)]'
                              : 'bg-[var(--color-status-outside-bg)] text-[var(--color-status-outside)] border-[var(--color-status-outside)]'
                          )}
                        >
                          {point.is_within_area ? t('monitoring:timeline.inArea') : t('monitoring:timeline.outArea')}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-nb-gray-500 mt-0.5">
                        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-nb-gray-400">
                        {point.accuracy !== null && <span>±{point.accuracy.toFixed(0)}m</span>}
                        {point.battery_level !== null && (
                          <span
                            className={point.battery_level < 20 ? 'text-red-500 font-semibold' : ''}
                          >
                            {point.battery_level}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
