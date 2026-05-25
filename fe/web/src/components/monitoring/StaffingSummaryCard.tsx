'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useStaffingSummary } from '@/lib/api/monitoring';
import type { BoundariesResponse, DayType, StaffingRoleBreakdown } from '@/lib/api/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { DAY_TYPE_LABELS } from '@/lib/constants/monitoring';
import { AlertTriangle, Users, ChevronDown, ChevronRight, ArrowRightLeft } from 'lucide-react';
import type { UserRole } from '@/types/models';

export interface StaffingSummaryCardProps {
  filters: { rayon_id?: string; area_id?: string };
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
  const present = role.active + role.idle + role.outside_area;
  const required = role.total_required > 0 ? role.total_required : role.total_assigned;
  const isFullyStaffed = present >= required;
  const roleLabel = ROLE_LABELS[role.role as UserRole] ?? role.role;

  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span className="w-24 truncate font-medium text-nb-gray-700">{roleLabel}</span>
      <div className="flex-1 h-1.5 bg-nb-gray-200 rounded-full overflow-hidden border border-nb-gray-300">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isFullyStaffed ? 'bg-[var(--color-status-active)]' : 'bg-[var(--color-status-idle)]'
          )}
          style={{ width: `${required > 0 ? Math.min((present / required) * 100, 100) : 0}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-nb-gray-500 tabular-nums">
        {present}/{required}
      </span>
      <div className="flex gap-1 text-[10px] text-nb-gray-400">
        <span title="Aktif" className="text-[var(--color-status-active)]">
          {role.active}
        </span>
        <span>/</span>
        <span title="Idle" className="text-[var(--color-status-idle)]">
          {role.idle}
        </span>
        <span>/</span>
        <span title="Di Luar" className="text-[var(--color-status-outside)]">
          {role.outside_area}
        </span>
        <span>/</span>
        <span title="Tidak Terdeteksi" className="text-[var(--color-status-missing)]">
          {role.missing}
        </span>
      </div>
    </div>
  );
}

interface UnderstaffedBadgeProps {
  shortage: number;
}

function UnderstaffedBadge({ shortage }: UnderstaffedBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-status-missing)] bg-[var(--color-status-missing-bg)] px-1.5 py-0.5 rounded-nb-sm border border-[var(--color-status-missing)]">
      <AlertTriangle className="w-2.5 h-2.5" />
      Kurang {shortage}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Area View (area_id filter selected)
// ---------------------------------------------------------------------------

interface AreaViewProps {
  areaId: string;
  onReassign?: (areaId: string) => void;
}

function AreaView({ areaId, onReassign }: AreaViewProps) {
  const { data, isLoading } = useStaffingSummary({ area_id: areaId });

  if (isLoading) {
    return <div className="h-20 bg-nb-gray-200 animate-pulse rounded-nb-base" />;
  }

  const areaItem = data?.items?.find((item) => item.id === areaId);
  if (!areaItem) return <p className="text-xs text-nb-gray-400 italic">Data tidak tersedia.</p>;

  const totalPresent = areaItem.total_active + areaItem.total_idle + areaItem.total_outside_area;
  const totalAll = totalPresent + areaItem.total_missing + areaItem.total_offline;
  const shortage = areaItem.roles.reduce((acc, r) => {
    const present = r.active + r.idle + r.outside_area;
    const required = r.total_required > 0 ? r.total_required : r.total_assigned;
    return acc + Math.max(0, required - present);
  }, 0);

  return (
    <div className="space-y-2">
      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-nb-black">
            {totalPresent} / {totalAll} hadir
          </span>
          <span className="text-nb-gray-500">
            {totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-nb-gray-200 border border-nb-black rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-status-active)] transition-all duration-300"
            style={{ width: `${totalAll > 0 ? (totalPresent / totalAll) * 100 : 0}%` }}
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
          Pindah Petugas {shortage > 0 ? `(Kurang ${shortage})` : ''}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rayon View (rayon_id filter selected) — per-area expandable rows
// ---------------------------------------------------------------------------

interface RayonViewProps {
  rayonId: string;
  boundaries?: BoundariesResponse;
  onReassign?: (areaId: string) => void;
}

function RayonView({ rayonId, boundaries, onReassign }: RayonViewProps) {
  const [expandedAreaIds, setExpandedAreaIds] = useState<Set<string>>(new Set());
  const rayon = boundaries?.rayons.find((r) => r.id === rayonId);

  if (!rayon) {
    return <p className="text-xs text-nb-gray-400 italic">Data rayon tidak tersedia.</p>;
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
      {rayon.areas.map((area) => {
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
                    Pindah Petugas
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
// City View (no filters) — per-rayon expandable accordion rows
// ---------------------------------------------------------------------------

interface CityViewProps {
  boundaries?: BoundariesResponse;
  onReassign?: (areaId: string) => void;
}

function CityView({ boundaries, onReassign }: CityViewProps) {
  const [expandedRayonIds, setExpandedRayonIds] = useState<Set<string>>(new Set());

  if (!boundaries?.rayons?.length) {
    return <p className="text-xs text-nb-gray-400 italic">Data wilayah tidak tersedia.</p>;
  }

  const toggleRayon = (rayonId: string) => {
    setExpandedRayonIds((prev) => {
      const next = new Set(prev);
      if (next.has(rayonId)) {
        next.delete(rayonId);
      } else {
        next.add(rayonId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {boundaries.rayons.map((rayon) => {
        const isExpanded = expandedRayonIds.has(rayon.id);
        const totalActive = rayon.areas.reduce(
          (acc, a) => acc + a.staffing_summary.reduce((s, r) => s + r.active, 0),
          0
        );
        const totalRequired = rayon.areas.reduce(
          (acc, a) => acc + a.staffing_summary.reduce((s, r) => s + r.required, 0),
          0
        );

        return (
          <div
            key={rayon.id}
            className={cn(
              'border-2 border-nb-black rounded-nb-base overflow-hidden',
              rayon.is_understaffed && 'border-l-4 border-l-[var(--color-status-missing)]'
            )}
          >
            <button
              onClick={() => toggleRayon(rayon.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 bg-nb-white hover:bg-nb-gray-50 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-nb-gray-500 flex-shrink-0" />
              )}
              <span className="flex-1 text-xs font-semibold text-nb-black truncate">
                {rayon.name}
              </span>
              <span className="text-xs font-mono text-nb-gray-600 tabular-nums">
                {totalActive}/{totalRequired}
              </span>
              {rayon.is_understaffed && (
                <UnderstaffedBadge shortage={rayon.understaffed_area_count} />
              )}
            </button>

            {isExpanded && (
              <div className="border-t-2 border-nb-black bg-nb-gray-50 px-2 py-2 space-y-1">
                {rayon.areas.map((area) => {
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
  const hasAreaFilter = !!filters.area_id;
  const hasRayonFilter = !!filters.rayon_id && !hasAreaFilter;
  const isCityView = !hasAreaFilter && !hasRayonFilter;

  const viewLabel = hasAreaFilter ? 'Area' : hasRayonFilter ? 'Rayon' : 'Seluruh Kota';

  return (
    <div className="border-2 border-nb-black rounded-nb-base shadow-nb-sm bg-nb-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-nb-black bg-nb-gray-50">
        <h3 className="text-xs font-bold uppercase text-nb-gray-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Ketersediaan Petugas
          <span className="text-nb-gray-400 font-normal normal-case">· {viewLabel}</span>
        </h3>
        {dayType && DAY_TYPE_LABELS[dayType] && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-nb-sm border"
            style={{
              color: DAY_TYPE_LABELS[dayType].color,
              background: DAY_TYPE_LABELS[dayType].bg,
              borderColor: DAY_TYPE_LABELS[dayType].color,
            }}
          >
            {DAY_TYPE_LABELS[dayType].label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {hasAreaFilter && <AreaView areaId={filters.area_id!} onReassign={onReassign} />}
        {hasRayonFilter && (
          <RayonView rayonId={filters.rayon_id!} boundaries={boundaries} onReassign={onReassign} />
        )}
        {isCityView && <CityView boundaries={boundaries} onReassign={onReassign} />}
      </div>
    </div>
  );
}
