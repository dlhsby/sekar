'use client';

/**
 * LocationTimeline - Location history timeline view in the side panel
 * Shows date picker, summary stats, and scrollable point list
 */

import { ArrowLeft, MapPin, Clock, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatMinutes, formatDistance, formatTimeWithSeconds } from '@/lib/utils/formatters';
import type { LocationHistory } from '@/lib/api/monitoring';

export interface LocationTimelineProps {
  history: LocationHistory | undefined;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
  userName: string;
}

export function LocationTimeline({
  history,
  isLoading,
  selectedDate,
  onDateChange,
  onBack,
  userName,
}: LocationTimelineProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 border-b border-nb-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-nb-gray-600 hover:text-nb-black transition-colors mb-2"
          aria-label="Kembali ke detail petugas"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <h3 className="font-black text-nb-black text-sm truncate">{userName}</h3>
        <p className="text-xs text-nb-gray-500">Riwayat Lokasi</p>
      </div>

      {/* Date picker */}
      <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200">
        <label htmlFor="location-date" className="text-xs font-bold text-nb-gray-600 mb-1 block">
          Pilih Tanggal
        </label>
        <input
          id="location-date"
          type="date"
          value={selectedDate}
          max={todayStr}
          onChange={(e) => onDateChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm border-2 border-nb-black rounded-nb-base',
            'bg-white focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1'
          )}
        />
      </div>

      {/* Summary stats */}
      {history && !isLoading && (
        <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200 bg-nb-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-nb-gray-500 font-semibold">Jarak</div>
              <div className="text-sm font-black">{formatDistance(history.total_distance_meters)}</div>
            </div>
            <div className="bg-white border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-nb-gray-500 font-semibold">Titik</div>
              <div className="text-sm font-black">{history.total_points}</div>
            </div>
            <div className="bg-[var(--color-status-active-bg)] border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-[#14532D] font-semibold">Dalam Area</div>
              <div className="text-sm font-black text-[#14532D]">
                {formatMinutes(history.time_inside_area_minutes)}
              </div>
            </div>
            <div className="bg-[var(--color-status-outside-bg)] border-2 border-nb-black rounded-nb-base p-2 text-center">
              <div className="text-xs text-[#581C87] font-semibold">Di Luar Area</div>
              <div className="text-sm font-black text-[#581C87]">
                {formatMinutes(history.time_outside_area_minutes)}
              </div>
            </div>
          </div>

          {/* Shift info */}
          {history.shift_name && (
            <div className="mt-2 text-xs text-nb-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Shift: <span className="font-semibold">{history.shift_name}</span>
              {history.clock_in_time && (
                <span className="ml-1">· Masuk: {formatTimeWithSeconds(history.clock_in_time)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Points list */}
      <div className="flex-1 overflow-y-auto" aria-label="Riwayat titik lokasi">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-nb-gray-200 animate-pulse rounded" />
            ))}
          </div>
        ) : !history ? (
          <div className="p-6 text-center text-nb-gray-500">
            <Navigation className="w-8 h-8 mx-auto mb-2 text-nb-gray-300" />
            <p className="text-sm font-semibold">Tidak ada riwayat lokasi</p>
            <p className="text-xs mt-1">Pilih tanggal lain atau periksa koneksi</p>
          </div>
        ) : history.points.length === 0 ? (
          <div className="p-6 text-center text-nb-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-nb-gray-300" />
            <p className="text-sm font-semibold">Tidak ada titik lokasi</p>
            <p className="text-xs mt-1">Tidak ada data GPS pada tanggal ini</p>
          </div>
        ) : (
          <ol className="relative" aria-label={`${history.total_points} titik lokasi`}>
            {history.points.map((point, index) => (
              <li
                key={`${point.logged_at}-${index}`}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 border-b border-nb-gray-100',
                  'hover:bg-nb-gray-50 transition-colors'
                )}
              >
                {/* Color indicator */}
                <span
                  className={cn(
                    'mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 border border-white shadow-sm',
                    point.is_within_area ? 'bg-[var(--color-status-active)]' : 'bg-[var(--color-status-outside)]'
                  )}
                  aria-hidden="true"
                />

                {/* Point info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-nb-black">
                      {formatTimeWithSeconds(point.logged_at)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                        point.is_within_area
                          ? 'bg-[var(--color-status-active-bg)] text-[#14532D] border-[var(--color-status-active)]'
                          : 'bg-[var(--color-status-outside-bg)] text-[#581C87] border-[var(--color-status-outside)]'
                      )}
                    >
                      {point.is_within_area ? 'Dalam Area' : 'Di Luar Area'}
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
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
