'use client';

/**
 * MonitoringSidePanel - Right-side panel for real-time monitoring
 * Shows status cards, search/filter, role chips, and scrollable user list
 * Phase 2D-10: Added role chip filters and severity-based sorting
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  getStatusLabels,
  STATUS_SEVERITY_ORDER,
} from '@/lib/constants/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { StatusCard } from './StatusCard';
import { UserListItem } from './UserListItem';
import type { LiveUser, LiveUsersResponse, TrackingStatus } from '@/lib/api/monitoring';
import type { UserRole } from '@/types/models';

export interface MonitoringSidePanelProps {
  data: LiveUsersResponse | undefined;
  isLoading: boolean;
  selectedUserId: string | null;
  onUserSelect: (user: LiveUser) => void;
}

export function MonitoringSidePanel({
  data,
  isLoading,
  selectedUserId,
  onUserSelect,
}: MonitoringSidePanelProps) {
  const { t } = useTranslation(['monitoring']);
  const statusLabels = getStatusLabels();
  const STATUS_CARDS: Array<{ status: TrackingStatus; label: string }> = [
    { status: 'active', label: statusLabels.active },
    { status: 'offline', label: statusLabels.offline },
    { status: 'absent', label: statusLabels.absent },
  ];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [roleFilters, setRoleFilters] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 300);

  const handleStatusToggle = useCallback((status: TrackingStatus) => {
    setStatusFilter((prev) => (prev === status ? null : status));
  }, []);

  const handleRoleToggle = useCallback((role: string) => {
    setRoleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }, []);

  const filteredUsers = useMemo(() => {
    const users = data?.users ?? [];

    const filtered = users.filter((user) => {
      const matchesSearch =
        !debouncedSearch ||
        user.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        user.area_name.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = !statusFilter || user.status === statusFilter;
      const matchesRole = roleFilters.size === 0 || roleFilters.has(user.role);

      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort by severity (most critical first)
    return filtered.sort((a, b) => {
      const aIdx = STATUS_SEVERITY_ORDER.indexOf(a.status);
      const bIdx = STATUS_SEVERITY_ORDER.indexOf(b.status);
      return aIdx - bIdx;
    });
  }, [data?.users, debouncedSearch, statusFilter, roleFilters]);

  const totalClocked = (data?.total_active ?? 0) + (data?.total_offline ?? 0);
  const totalAll =
    (data?.total_active ?? 0) +
    (data?.total_offline ?? 0) +
    (data?.total_absent ?? 0);

  const hasActiveFilters = !!search || !!statusFilter || roleFilters.size > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-3 pt-3 pb-2 border-b-2 border-nb-black bg-nb-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-nb-gray-600 uppercase tracking-wide">
            {t('monitoring:sidePanel.title')}
          </span>
          <span className="text-xs text-nb-gray-500">
            {t('monitoring:sidePanel.summary', { totalOnline: totalClocked, totalAll })}
          </span>
        </div>

        {/* Status cards 2x2 grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {STATUS_CARDS.map(({ status, label }) => {
            const countMap: Record<TrackingStatus, number> = {
              active: data?.total_active ?? 0,
              offline: data?.total_offline ?? 0,
              absent: data?.total_absent ?? 0,
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

      {/* Search + Role chips */}
      <div className="px-3 py-2 flex-shrink-0 border-b border-nb-gray-200">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nb-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder={t('monitoring:sidePanel.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-8 pr-3 py-2 text-sm border-2 border-nb-black rounded-nb-base',
              'bg-white placeholder:text-nb-gray-400 focus:outline-none focus:ring-2',
              'focus:ring-nb-primary focus:ring-offset-1'
            )}
            aria-label={t('monitoring:sidePanel.searchLabel')}
          />
        </div>

        {/* Role chip filters */}
        <div
          className="flex gap-1.5 flex-wrap"
          role="group"
          aria-label={t('monitoring:sidePanel.roleFilter')}
        >
          {[
            { role: 'satgas', label: ROLE_LABELS.satgas },
            { role: 'linmas', label: ROLE_LABELS.linmas },
            { role: 'korlap', label: ROLE_LABELS.korlap },
          ].map(({ role, label }) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleToggle(role)}
              aria-pressed={roleFilters.has(role)}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded-nb-sm border-2 border-nb-black transition-all',
                roleFilters.has(role)
                  ? 'bg-nb-primary text-white shadow-nb-active'
                  : 'bg-white text-nb-gray-600 shadow-nb-xs hover:bg-nb-gray-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto" role="listbox">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-nb-gray-200 animate-pulse rounded-nb-base" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-nb-gray-500">
            <p className="font-semibold text-sm">{t('monitoring:sidePanel.noWorkers')}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter(null);
                  setRoleFilters(new Set());
                }}
                className="text-xs text-nb-primary underline mt-2"
              >
                {t('monitoring:sidePanel.resetFilter')}
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
          {t('monitoring:sidePanel.count', { count: filteredUsers.length })}
        </div>
      )}
    </div>
  );
}
