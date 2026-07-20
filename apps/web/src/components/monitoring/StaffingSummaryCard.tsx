'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { useStaffingSummary } from '@/lib/api/monitoring';
import type { BoundariesResponse, DayType, StaffingRoleBreakdown } from '@/lib/api/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { getDayTypeLabels } from '@/lib/constants/monitoring';
import { AlertTriangle, Users, ChevronDown, ChevronRight, ArrowRightLeft } from 'lucide-react';
import type { UserRole } from '@/types/models';

export interface StaffingSummaryCardProps {
  filters: { district_id?: string; location_id?: string };
  boundaries?: BoundariesResponse;
  dayType?: DayType;
  onReassign?: (areaId: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface RoleRowProps {
  role: StaffingRoleBreakdown;
}

function RoleRow({ role }: RoleRowProps) {
  const { t } = useTranslation(['monitoring']);
  const clocked = role.active + role.offline;
  const required = role.total_required > 0 ? role.total_required : role.total_assigned;
  const isFullyStaffed = clocked >= required;
  const roleLabel = ROLE_LABELS[role.role as UserRole] ?? role.role;

  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span className="w-24 truncate font-medium text-nb-gray-700">{roleLabel}</span>
      <div className="flex-1 h-1.5 bg-nb-gray-200 rounded-full overflow-hidden border border-nb-gray-300">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isFullyStaffed ? 'bg-[var(--color-status-active)]' : 'bg-[var(--color-status-offline)]'
          )}
          style={{ width: `${required > 0 ? Math.min((clocked / required) * 100, 100) : 0}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-nb-gray-500 tabular-nums">
        {clocked}/{required}
      </span>
      <div className="flex gap-1 text-[10px] text-nb-gray-400">
        <span title={t('monitoring:staffing.activeStatus')} className="text-[var(--color-status-active)]">
          {role.active}
        </span>
        <span>/</span>
        <span title={t('monitoring:staffing.offlineStatus')} className="text-[var(--color-status-offline)]">
          {role.offline}
        </span>
        <span>/</span>
        <span title={t('monitoring:staffing.absentStatus')} className="text-[var(--color-status-missing)]">
          {role.absent}
        </span>
        <span>/</span>
        <span title={t('monitoring:staffing.outsideStatus')} className="text-[var(--color-status-outside)]">
          {role.outside_area}
        </span>
      </div>
    </div>
  );
}

interface UnderstaffedBadgeProps {
  shortage: number;
}

function UnderstaffedBadge({ shortage }: UnderstaffedBadgeProps) {
  const { t } = useTranslation(['monitoring']);
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-status-missing)] bg-[var(--color-status-missing-bg)] px-1.5 py-0.5 rounded-nb-sm border border-[var(--color-status-missing)]">
      <AlertTriangle className="w-2.5 h-2.5" />
      {t('monitoring:staffing.shortageLabel')} {shortage}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Area View (location_id filter selected)
// ---------------------------------------------------------------------------

interface AreaViewProps {
  areaId: string;
  onReassign?: (areaId: string) => void;
}

function AreaView({ areaId, onReassign }: AreaViewProps) {
  const { t } = useTranslation(['monitoring']);
  const { data, isLoading } = useStaffingSummary({ location_id: areaId });

  if (isLoading) {
    return <div className="h-20 bg-nb-gray-200 animate-pulse rounded-nb-base" />;
  }

  const areaItem = data?.items?.find((item) => item.id === areaId);
  if (!areaItem) return <p className="text-xs text-nb-gray-400 italic">{t('monitoring:staffing.dataUnavailable')}</p>;

  const totalClocked = areaItem.total_active + areaItem.total_offline;
  const totalAll = areaItem.total_active + areaItem.total_offline + areaItem.total_absent;
  const shortage = areaItem.roles.reduce((acc, r) => {
    const clocked = r.active + r.offline;
    const required = r.total_required > 0 ? r.total_required : r.total_assigned;
    return acc + Math.max(0, required - clocked);
  }, 0);

  return (
    <div className="space-y-2">
      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-nb-black">
            {totalClocked} / {totalAll} {t('monitoring:staffing.presentLabel')}
          </span>
          <span className="text-nb-gray-500">
            {totalAll > 0 ? Math.round((totalClocked / totalAll) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-nb-gray-200 border border-nb-black rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-status-active)] transition-all duration-300"
            style={{ width: `${totalAll > 0 ? (totalClocked / totalAll) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-role breakdown */}
      <div className="space-y-0.5">
        {areaItem.roles.map((role) => (
          <RoleRow key={role.role} role={role} />
        ))}
      </div>

      {/* Reassign button for understaffed areas */}
      {!areaItem.is_fully_staffed && onReassign && (
        <button
          onClick={() => onReassign(areaId)}
          className="flex items-center gap-1.5 text-xs font-bold text-nb-white bg-nb-black px-2.5 py-1.5 rounded-nb-base border-2 border-nb-black hover:bg-nb-gray-800 transition-colors w-full justify-center mt-1"
        >
          <ArrowRightLeft className="w-3 h-3" />
          {t('monitoring:staffing.reassignButton')} {shortage > 0 ? `(${t('monitoring:staffing.shortageLabel')} ${shortage})` : ''}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rayon View (district_id filter selected) — per-area expandable rows
// ---------------------------------------------------------------------------

interface DistrictViewProps {
  districtId: string;
  boundaries?: BoundariesResponse;
  onReassign?: (areaId: string) => void;
}

function DistrictView({ districtId, boundaries, onReassign }: DistrictViewProps) {
  const { t } = useTranslation(['monitoring']);
  const [expandedAreaIds, setExpandedAreaIds] = useState<Set<string>>(new Set());
  const district = boundaries?.districts.find((r) => r.id === districtId);

  if (!district) {
    return <p className="text-xs text-nb-gray-400 italic">{t('monitoring:staffing.districtDataUnavailable')}</p>;
  }

  const toggleArea = (areaId: string) => {
    setExpandedAreaIds((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {district.areas.map((area) => {
        const isExpanded = expandedAreaIds.has(area.id);
        const activeCount = area.staffing_summary.reduce((acc, s) => acc + s.active, 0);
        const requiredCount = area.staffing_summary.reduce((acc, s) => acc + s.required, 0);
        const shortage = requiredCount - activeCount;

        return (
          <div
            key={area.id}
            className={cn(
              'border-2 border-nb-black rounded-nb-base overflow-hidden',
              area.is_understaffed && 'border-l-4 border-l-[var(--color-status-missing)]'
            )}
          >
            <button
              onClick={() => toggleArea(area.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 bg-nb-white hover:bg-nb-gray-50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              )}
              <span className="flex-1 text-xs font-semibold text-nb-black truncate">
                {area.name}
              </span>
              <span className="text-xs font-mono text-nb-gray-600 tabular-nums">
                {activeCount}/{requiredCount}
              </span>
              {area.is_understaffed && shortage > 0 && <UnderstaffedBadge shortage={shortage} />}
            </button>

            {isExpanded && (
              <div className={cn('px-3 py-2 border-t-2 border-nb-black bg-nb-gray-50 space-y-1')}>
                {area.staffing_summary.map((s) => {
                  const roleLabel = ROLE_LABELS[s.role as UserRole] ?? s.role;
                  const isFullyStaffed = s.active >= s.required;
                  return (
                    <div key={s.role} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate font-medium text-nb-gray-700">
                        {roleLabel}
                      </span>
                      <div className="flex-1 h-1.5 bg-nb-gray-200 rounded-full overflow-hidden border border-nb-gray-300">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            isFullyStaffed ? 'bg-[var(--color-status-active)]' : 'bg-[var(--color-status-idle)]'
                          )}
                          style={{
                            width: `${s.required > 0 ? Math.min((s.active / s.required) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-nb-gray-500 tabular-nums">
                        {s.active}/{s.required}
                      </span>
                    </div>
                  );
                })}
                {area.is_understaffed && onReassign && (
                  <button
                    onClick={() => onReassign(area.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-nb-white bg-nb-black px-2.5 py-1.5 rounded-nb-base border-2 border-nb-black hover:bg-nb-gray-800 transition-colors w-full justify-center mt-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    {t('monitoring:staffing.reassignButton')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// City View (no filters) — per-district expandable accordion rows
// ---------------------------------------------------------------------------

interface CityViewProps {
  boundaries?: BoundariesResponse;
  onReassign?: (areaId: string) => void;
}

function CityView({ boundaries, onReassign }: CityViewProps) {
  const { t } = useTranslation(['monitoring']);
  const [expandedDistrictIds, setExpandedDistrictIds] = useState<Set<string>>(new Set());

  if (!boundaries?.districts?.length) {
    return <p className="text-xs text-nb-gray-400 italic">{t('monitoring:staffing.cityDataUnavailable')}</p>;
  }

  const toggleDistrict = (districtId: string) => {
    setExpandedDistrictIds((prev) => {
      const next = new Set(prev);
      if (next.has(districtId)) {
        next.delete(districtId);
      } else {
        next.add(districtId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {boundaries.districts.map((district) => {
        const isExpanded = expandedDistrictIds.has(district.id);
        const totalActive = district.areas.reduce(
          (acc, a) => acc + a.staffing_summary.reduce((s, r) => s + r.active, 0),
          0
        );
        const totalRequired = district.areas.reduce(
          (acc, a) => acc + a.staffing_summary.reduce((s, r) => s + r.required, 0),
          0
        );

        return (
          <div
            key={district.id}
            className={cn(
              'border-2 border-nb-black rounded-nb-base overflow-hidden',
              district.is_understaffed && 'border-l-4 border-l-[var(--color-status-missing)]'
            )}
          >
            <button
              onClick={() => toggleDistrict(district.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 bg-nb-white hover:bg-nb-gray-50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              )}
              <span className="flex-1 text-xs font-semibold text-nb-black truncate">
                {district.name}
              </span>
              <span className="text-xs font-mono text-nb-gray-600 tabular-nums">
                {totalActive}/{totalRequired}
              </span>
              {district.is_understaffed && (
                <UnderstaffedBadge shortage={district.understaffed_area_count} />
              )}
            </button>

            {isExpanded && (
              <div className="border-t-2 border-nb-black bg-nb-gray-50 px-2 py-2 space-y-1">
                {district.areas.map((area) => {
                  const areaActive = area.staffing_summary.reduce((acc, s) => acc + s.active, 0);
                  const areaRequired = area.staffing_summary.reduce(
                    (acc, s) => acc + s.required,
                    0
                  );
                  const shortage = areaRequired - areaActive;

                  return (
                    <div
                      key={area.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-nb-sm border border-nb-gray-200 bg-nb-white text-xs',
                        area.is_understaffed && 'border-l-4 border-l-[var(--color-status-missing)]'
                      )}
                    >
                      <span className="flex-1 font-medium text-nb-gray-700 truncate">
                        {area.name}
                      </span>
                      <span className="font-mono text-nb-gray-500 tabular-nums">
                        {areaActive}/{areaRequired}
                      </span>
                      {area.is_understaffed && shortage > 0 && (
                        <UnderstaffedBadge shortage={shortage} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StaffingSummaryCard({
  filters,
  boundaries,
  dayType,
  onReassign,
}: StaffingSummaryCardProps) {
  const { t } = useTranslation(['monitoring']);
  const dayTypeLabels = getDayTypeLabels();
  const hasAreaFilter = !!filters.location_id;
  const hasDistrictFilter = !!filters.district_id && !hasAreaFilter;
  const isCityView = !hasAreaFilter && !hasDistrictFilter;

  const viewLabel = hasAreaFilter ? 'Area' : hasDistrictFilter ? 'Rayon' : t('monitoring:staffing.cityViewLabel');

  return (
    <div className="border-2 border-nb-black rounded-nb-base shadow-nb-sm bg-nb-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-nb-black bg-nb-gray-50">
        <h3 className="text-xs font-bold uppercase text-nb-gray-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {t('monitoring:staffing.staffingLabel')}
          <span className="text-nb-gray-400 font-normal normal-case">· {viewLabel}</span>
        </h3>
        {dayType && dayTypeLabels[dayType] && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-nb-sm border"
            style={{
              color: dayTypeLabels[dayType].color,
              background: dayTypeLabels[dayType].bg,
              borderColor: dayTypeLabels[dayType].color,
            }}
          >
            {dayTypeLabels[dayType].label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {hasAreaFilter && <AreaView areaId={filters.location_id!} onReassign={onReassign} />}
        {hasDistrictFilter && (
          <DistrictView districtId={filters.district_id!} boundaries={boundaries} onReassign={onReassign} />
        )}
        {isCityView && <CityView boundaries={boundaries} onReassign={onReassign} />}
      </div>
    </div>
  );
}
