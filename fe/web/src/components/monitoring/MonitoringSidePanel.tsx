'use client';

/**
 * MonitoringSidePanel - Right-side panel for real-time monitoring
 * Shows status cards, search/filter, and scrollable user list
 */

import { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { STATUS_LABELS as MONITORING_STATUS_LABELS } from '@/lib/constants/monitoring';
import { StatusCard } from './StatusCard';
import { UserListItem } from './UserListItem';
import type { LiveUser, LiveUsersResponse, TrackingStatus } from '@/lib/api/monitoring';

export interface MonitoringSidePanelProps {
  data: LiveUsersResponse | undefined;
  isLoading: boolean;
  selectedUserId: string | null;
  onUserSelect: (user: LiveUser) => void;
}

const STATUS_CARDS: Array<{ status: TrackingStatus; label: string }> = [
  { status: 'active', label: MONITORING_STATUS_LABELS.active },
  { status: 'inactive', label: MONITORING_STATUS_LABELS.inactive },
  { status: 'outside_area', label: MONITORING_STATUS_LABELS.outside_area },
  { status: 'missing', label: MONITORING_STATUS_LABELS.missing },
];

export function MonitoringSidePanel({
  data,
  isLoading,
  selectedUserId,
  onUserSelect,
}: MonitoringSidePanelProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const handleStatusToggle = useCallback(
    (status: TrackingStatus) => {
      setStatusFilter((prev) => (prev === status ? null : status));
    },
    []
  );

  const filteredUsers = useMemo(() => {
    const users = data?.users ?? [];
    return users.filter((user) => {
      const matchesSearch =
        !debouncedSearch ||
        user.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.area_name.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = !statusFilter || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data?.users, debouncedSearch, statusFilter]);

  const totalOnline = (data?.total_active ?? 0) + (data?.total_inactive ?? 0);
  const totalAll =
    (data?.total_active ?? 0) +
    (data?.total_inactive ?? 0) +
    (data?.total_outside_area ?? 0) +
    (data?.total_missing ?? 0) +
    (data?.total_offline ?? 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-3 pt-3 pb-2 border-b-2 border-nb-black bg-nb-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-nb-gray-600 uppercase tracking-wide">
            Petugas
          </span>
          <span className="text-xs text-nb-gray-500">
            {totalOnline} aktif / {totalAll} total
          </span>
        </div>

        {/* Status cards 2x2 grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {STATUS_CARDS.map(({ status, label }) => {
            const countMap: Record<TrackingStatus, number> = {
              active: data?.total_active ?? 0,
              inactive: data?.total_inactive ?? 0,
              outside_area: data?.total_outside_area ?? 0,
              missing: data?.total_missing ?? 0,
              offline: data?.total_offline ?? 0,
            };
            return (
              <StatusCard
                key={status}
                label={label}
                count={countMap[status]}
                status={status}
                isActive={statusFilter === status}
                onClick={() => handleStatusToggle(status)}
              />
            );
          })}
        </div>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nb-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Cari petugas atau area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-8 pr-3 py-2 text-sm border-2 border-nb-black rounded-nb-base',
              'bg-white placeholder:text-nb-gray-400 focus:outline-none focus:ring-2',
              'focus:ring-nb-primary focus:ring-offset-1'
            )}
            aria-label="Cari petugas"
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Daftar petugas aktif">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-nb-gray-200 animate-pulse rounded-nb-base" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-nb-gray-500">
            <p className="font-semibold text-sm">Tidak ada petugas ditemukan</p>
            {(search || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter(null);
                }}
                className="text-xs text-nb-primary underline mt-2"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              isSelected={selectedUserId === user.id}
              onClick={() => onUserSelect(user)}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      {!isLoading && filteredUsers.length > 0 && (
        <div className="px-3 py-1.5 text-xs text-center text-nb-gray-400 border-t border-nb-gray-200 flex-shrink-0">
          {filteredUsers.length} petugas ditampilkan
        </div>
      )}
    </div>
  );
}
