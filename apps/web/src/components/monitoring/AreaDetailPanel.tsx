'use client';

/**
 * AreaDetailPanel — the detail card for a rayon / kawasan / lokasi, opened by
 * tapping a node's ⓘ badge on the map or the chevron on a Wilayah row.
 *
 * Mirrors mobile's `BoundaryDetailModal` so the two platforms read the same:
 * hero (kind + name + staffing pill) → KPI tiles → presence → roster → per-role
 * staffing. Deliberately kept a PURE renderer — every number arrives as a prop,
 * because the page already owns the aggregate and boundary queries and a second
 * fetch here would be a second source of truth for counts this feature has twice
 * shipped bugs in.
 *
 * One deliberate divergence from mobile: no child-area list. Mobile shows one
 * because it has no persistent panel; on web the Wilayah tab is always on screen
 * next to this card, so repeating the children here would be duplicate UI that
 * can disagree with itself.
 */
import { useTranslation } from 'react-i18next';
import { X, Trees, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

export type AreaDetailVariant = 'district' | 'region' | 'location';

/** Per-role requirement vs live headcount, as `boundaries` reports it. */
export interface RoleStaffing {
  role: string;
  required: number;
  active: number;
}

export interface AreaDetailPresence {
  aktif: number;
  tidak_aktif: number;
  tidak_hadir: number;
  adhoc: number;
}

export interface AreaDetailRoster {
  scheduled: number;
  clocked_in: number;
  belum_hadir: number;
  tidak_hadir: number;
}

export interface AreaDetailPanelProps {
  variant: AreaDetailVariant;
  name: string;
  presence: AreaDetailPresence;
  presenceLabels: { key: keyof AreaDetailPresence; label: string; color: string }[];
  roster?: AreaDetailRoster | null;
  /** Child count — lokasi in a rayon/kawasan. Omitted for a lokasi. */
  childCount?: number | null;
  /** How many of those children are short-staffed. */
  understaffedChildCount?: number | null;
  /** Lokasi only: live vs required headcount and the per-role split. */
  staffing?: RoleStaffing[] | null;
  isUnderstaffed?: boolean;
  /** Lokasi only: plant inventory summary (mobile's "Tanaman" row). */
  plantCount?: number | null;
  notableCount?: number | null;
  /** Opens the lokasi's plant list — omitted when the caller has nowhere to go. */
  onViewPlants?: () => void;
  /**
   * Open reassignment for this lokasi. Restores an entry point stripped by the
   * 2026-06-10 "minimal reliable map baseline" rebuild (49026d85), whose own
   * message said drawers would be layered back on — filters and boundaries were,
   * this was not, and the modals have sat unreachable since.
   */
  onReassign?: () => void;
  onClose: () => void;
}

function StatTile({
  label,
  value,
  detail,
  tone = 'neutral',
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'ok' | 'warn';
  /** Stable handle — tile LABELS are localized and collide with the presence
   *  pills ("Aktif" is both a tile and a presence bucket). */
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex-1 rounded-nb-sm border-2 border-nb-black px-2 py-1.5',
        tone === 'ok' && 'bg-nb-success-light',
        tone === 'warn' && 'bg-nb-warning-light',
        tone === 'neutral' && 'bg-nb-gray-50'
      )}
    >
      <span className="block text-[10px] font-bold uppercase text-nb-gray-500">{label}</span>
      <span className="block font-mono text-base font-black tabular-nums text-nb-black">
        {value}
      </span>
      {detail && <span className="block text-[10px] text-nb-gray-500">{detail}</span>}
    </div>
  );
}

export function AreaDetailPanel({
  variant,
  name,
  presence,
  presenceLabels,
  roster,
  childCount,
  understaffedChildCount,
  staffing,
  isUnderstaffed,
  plantCount,
  notableCount,
  onViewPlants,
  onReassign,
  onClose,
}: AreaDetailPanelProps) {
  const { t } = useTranslation();
  const isLocation = variant === 'location';

  return (
    <div className="absolute right-3 top-40 z-30 max-h-[70%] w-72 overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white p-3 shadow-nb-lg sm:top-32">
      {/* Hero */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-nb-gray-500">
            {t(`monitoring:areaDetail.${variant}`)}
          </p>
          <h2 className="text-sm font-black leading-tight text-nb-black">{name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('monitoring:page.closePanelLabel')}
          className="shrink-0 rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Staffing verdict — the first thing a supervisor looks for. */}
      {isUnderstaffed != null && (
        <span
          className={cn(
            'mb-2 inline-block rounded-nb-sm border-2 border-nb-black px-2 py-0.5 text-xs font-bold',
            isUnderstaffed ? 'bg-nb-danger-light text-nb-black' : 'bg-nb-success-light text-nb-black'
          )}
        >
          {isUnderstaffed
            ? t('monitoring:boundaryDetail.understaffed')
            : t('monitoring:boundaryDetail.sufficient')}
        </span>
      )}

      {/* KPI tiles: children for a rayon/kawasan, headcount for a lokasi. */}
      <div className="mb-2 flex gap-1.5">
        {isLocation ? (
          <>
            <StatTile
              testId="tile-headcount"
              label={t('monitoring:boundaryDetail.activeLabel')}
              value={String(presence.aktif + presence.tidak_aktif)}
              tone={isUnderstaffed ? 'warn' : 'ok'}
            />
            <StatTile
              testId="tile-assigned"
              label={t('monitoring:boundaryDetail.assignedLabel')}
              value={String(roster?.scheduled ?? 0)}
            />
          </>
        ) : (
          <>
            <StatTile
              testId="tile-children"
              label={t('monitoring:boundaryDetail.areaLabel')}
              value={String(childCount ?? 0)}
            />
            <StatTile
              testId="tile-understaffed-children"
              label={t('monitoring:boundaryDetail.understaffedLabel')}
              value={String(understaffedChildCount ?? 0)}
              tone={(understaffedChildCount ?? 0) > 0 ? 'warn' : 'ok'}
            />
          </>
        )}
      </div>

      {/* Presence (ADR-050) */}
      <div className="grid grid-cols-2 gap-1.5">
        {presenceLabels.map((p) => (
          <div
            key={p.key}
            className="flex items-center justify-between rounded-nb-sm border border-nb-gray-200 px-2 py-1 text-xs"
          >
            <span className="flex items-center gap-1.5 text-nb-gray-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              />
              {p.label}
            </span>
            <span className="font-mono font-bold tabular-nums text-nb-black">
              {presence[p.key]}
            </span>
          </div>
        ))}
      </div>

      {/* Roster */}
      {roster && (
        <div className="mt-2 border-t-2 border-nb-gray-200 pt-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-nb-gray-600">
            {(
              [
                [t('monitoring:aggregate.scheduledLabel'), roster.scheduled],
                [t('monitoring:aggregate.clockedInLabel'), roster.clocked_in],
                [t('monitoring:aggregate.belumHadirLabel'), roster.belum_hadir],
                [t('monitoring:aggregate.tidakHadirLabel'), roster.tidak_hadir],
              ] as [string, number][]
            ).map(([label, n]) => (
              <span key={label} className="flex items-baseline gap-1">
                <span className="font-mono font-bold tabular-nums text-nb-black">{n}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tanaman — lokasi only. Mobile opens a sub-sheet; on web the plants page
          already exists, so the row links there rather than duplicating it. */}
      {isLocation && plantCount != null && (
        <button
          type="button"
          onClick={onViewPlants}
          disabled={!onViewPlants}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-nb-sm border-2 border-nb-black bg-nb-gray-50 px-2 py-1.5 text-left disabled:cursor-default"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold text-nb-black">
            <Trees className="h-3.5 w-3.5" aria-hidden="true" />
            {t('monitoring:boundaryDetail.plantsLabel')}
          </span>
          <span className="text-xs text-nb-gray-600">
            {t('monitoring:boundaryDetail.plantsCount', {
              count: plantCount,
              notable: notableCount ?? 0,
            })}
          </span>
        </button>
      )}

      {/* Reassign — understaffed lokasi only, matching mobile's long-dormant
          button. The modal pulls workers INTO this area, so offering it on a
          fully-staffed lokasi would invite a move with nothing to fix. */}
      {isLocation && isUnderstaffed && onReassign && (
        <button
          type="button"
          onClick={onReassign}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-nb-sm border-2 border-nb-black bg-nb-primary px-2 py-1.5 text-left font-bold text-nb-black shadow-nb-xs transition-colors hover:bg-nb-primary-hover"
          data-testid="area-detail-reassign"
        >
          <span className="flex items-center gap-1.5 text-xs">
            <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('monitoring:bulkReassign.openLabel')}
          </span>
        </button>
      )}

      {/* Per-role staffing — lokasi only; a rayon's requirement is the sum of its
          lokasi, which the KPI tiles above already summarise. */}
      {isLocation && staffing && staffing.length > 0 && (
        <div className="mt-2 border-t-2 border-nb-gray-200 pt-2">
          <h3 className="mb-1 text-xs font-bold uppercase text-nb-gray-500">
            {t('monitoring:boundaryDetail.staffingTitle')}
          </h3>
          <ul className="space-y-1">
            {staffing.map((s) => {
              const delta = s.active - s.required;
              return (
                <li key={s.role} className="flex items-center justify-between text-xs">
                  <span className="text-nb-gray-600">
                    {ROLE_LABELS[s.role as UserRole] ?? s.role}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums text-nb-black">
                      {s.active}/{s.required}
                    </span>
                    <span
                      className={cn(
                        'rounded-nb-sm px-1 font-mono text-[10px] font-bold',
                        delta < 0
                          ? 'bg-nb-danger-light text-nb-danger-dark'
                          : 'bg-nb-success-light text-nb-success-dark'
                      )}
                    >
                      {delta >= 0 ? `+${delta}` : delta}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
