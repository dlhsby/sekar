'use client';

/**
 * CapacityWeeklyGrid — CAP-1 weekly capacity view (Phase 3-R4).
 *
 * Service types as rows × ISO weeks as columns. Each cell shows booked/capacity
 * with a progress bar. Editable cells (for write roles) track changes; Simpan
 * button upserts all modifications atomically.
 *
 * Desktop = sticky matrix; <768px collapses to per-service-type cards.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CapacityRow, useCapacityCalendar, useUpsertCapacity } from '@/lib/api/capacity';
import { isoWeekStart } from '@/lib/utils/iso-week';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui';

export interface CapacityWeeklyGridProps {
  rayonId: string;
  year: number;
  fromWeek: number;
  toWeek: number;
  serviceTypes: string[];
  canEdit: boolean;
  loading?: boolean;
}

/** Capacity cell mutations (only edited cells are sent) */
interface EditedCell {
  isoWeek: number;
  serviceType: string;
  capacityUnits: number;
}

export function CapacityWeeklyGrid({
  rayonId,
  year,
  fromWeek,
  toWeek,
  serviceTypes,
  canEdit,
  loading,
}: CapacityWeeklyGridProps) {
  const { t } = useTranslation();
  const { data: capacities = [] } = useCapacityCalendar(rayonId, {
    year,
    fromWeek,
    toWeek,
  });

  const upsertMutation = useUpsertCapacity(rayonId);
  const [edited, setEdited] = useState<Map<string, EditedCell>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Build a lookup map: `${isoWeek}:${serviceType}` → row
  const capacityMap = useMemo(() => {
    const map = new Map<string, CapacityRow>();
    for (const c of capacities) {
      map.set(`${c.isoWeek}:${c.serviceType}`, c);
    }
    return map;
  }, [capacities]);

  // Generate weeks array
  const weeks = useMemo(() => {
    const result: { isoWeek: number; start: Date; label: string }[] = [];
    for (let w = fromWeek; w <= toWeek; w++) {
      const start = isoWeekStart(year, w);
      const label = `W${w}`;
      result.push({ isoWeek: w, start, label });
    }
    return result;
  }, [fromWeek, toWeek, year]);

  const handleCapacityChange = (isoWeek: number, serviceType: string, value: string) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;

    const key = `${isoWeek}:${serviceType}`;
    setEdited((prev) => {
      const next = new Map(prev);
      next.set(key, { isoWeek, serviceType, capacityUnits: num });
      return next;
    });
  };

  const handleSave = async () => {
    if (edited.size === 0) {
      toast.info(t('schedules:capacity.noChangesToSave'));
      return;
    }

    setIsSaving(true);
    try {
      // Upsert each edited cell
      const promises = Array.from(edited.values()).map((cell) =>
        upsertMutation.mutateAsync({
          year,
          isoWeek: cell.isoWeek,
          serviceType: cell.serviceType,
          capacityUnits: cell.capacityUnits,
        }),
      );

      await Promise.all(promises);
      toast.success(t('schedules:capacity.saved'));
      setEdited(new Map());
    } catch (err) {
      const message = err instanceof Error ? err.message : t('schedules:capacity.saveError');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 animate-shimmer rounded-nb-md border-2 border-nb-black bg-nb-gray-300" />
    );
  }

  if (serviceTypes.length === 0) {
    return (
      <div className="rounded-nb-md border-2 border-dashed border-nb-gray-300 px-4 py-12 text-center text-nb-body-sm text-nb-gray-500">
        {t('schedules:capacity.noServiceTypes')}
      </div>
    );
  }

  // Desktop/tablet matrix
  return (
    <>
      <div className="hidden overflow-x-auto rounded-nb-md border-2 border-nb-black shadow-nb-sm md:block">
        <div className="grid min-w-[800px]" style={{ gridTemplateColumns: `140px repeat(${weeks.length}, 1fr)` }}>
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b-2 border-r-[1.5px] border-nb-black border-r-nb-gray-300 bg-nb-gray-50 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
            {t('schedules:capacity.serviceTypeHeader')}
          </div>
          {weeks.map((week) => (
            <div
              key={week.isoWeek}
              className="border-b-2 border-r-[1.5px] border-nb-black border-r-nb-gray-300 px-2 py-2 text-center last:border-r-0"
            >
              <div className="font-mono text-[10.5px] font-bold text-nb-black">{week.label}</div>
              <div className="text-[11px] text-nb-gray-600">
                {week.start.getMonth() + 1}/{week.start.getDate()}
              </div>
            </div>
          ))}

          {/* Service type rows */}
          {serviceTypes.map((serviceType) => (
            <CapacityServiceRow
              key={serviceType}
              serviceType={serviceType}
              weeks={weeks}
              capacityMap={capacityMap}
              edited={edited}
              canEdit={canEdit}
              onCapacityChange={handleCapacityChange}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Mobile: per-service-type cards */}
      <div className="space-y-3 md:hidden">
        {serviceTypes.map((serviceType) => (
          <div key={serviceType} className="rounded-nb-base border-2 border-nb-black bg-nb-white p-3">
            <div className="mb-3 font-bold text-nb-black capitalize">{serviceType}</div>
            <div className="space-y-2">
              {weeks.map((week) => {
                const key = `${week.isoWeek}:${serviceType}`;
                const capacity = capacityMap.get(key);
                const editedCell = edited.get(key);
                const displayCapacity = editedCell?.capacityUnits ?? capacity?.capacityUnits ?? 0;
                const booked = capacity?.bookedUnits ?? 0;

                return (
                  <div key={week.isoWeek} className="flex items-center justify-between gap-2">
                    <span className="text-nb-body-sm text-nb-gray-600">{week.label}</span>
                    <div className="flex flex-1 gap-2">
                      {canEdit ? (
                        <input
                          type="number"
                          min="0"
                          value={displayCapacity}
                          onChange={(e) =>
                            handleCapacityChange(week.isoWeek, serviceType, e.target.value)
                          }
                          className="h-8 w-16 border-2 border-nb-black px-2 text-center text-nb-body-sm"
                        />
                      ) : (
                        <span className="text-nb-body-sm font-mono">{displayCapacity}</span>
                      )}
                      <span className="text-nb-body-sm text-nb-gray-600">
                        {booked}/{displayCapacity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save button (only show if editable and has changes) */}
      {canEdit && edited.size > 0 && (
        <div className="mt-4 flex gap-2">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            {t('common:actions.save')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setEdited(new Map())}
            disabled={isSaving}
          >
            {t('common:actions.cancel')}
          </Button>
        </div>
      )}
    </>
  );
}

interface CapacityServiceRowProps {
  serviceType: string;
  weeks: { isoWeek: number; start: Date; label: string }[];
  capacityMap: Map<string, CapacityRow>;
  edited: Map<string, EditedCell>;
  canEdit: boolean;
  onCapacityChange: (isoWeek: number, serviceType: string, value: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function CapacityServiceRow({
  serviceType,
  weeks,
  capacityMap,
  edited,
  canEdit,
  onCapacityChange,
  t,
}: CapacityServiceRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-b-[1.5px] border-r-[1.5px] border-b-nb-gray-200 border-r-nb-gray-300 bg-nb-white px-3 py-2">
        <span className="text-nb-body-sm font-bold capitalize text-nb-black">{serviceType}</span>
      </div>
      {weeks.map((week) => {
        const key = `${week.isoWeek}:${serviceType}`;
        const capacity = capacityMap.get(key);
        const editedCell = edited.get(key);
        const displayCapacity = editedCell?.capacityUnits ?? capacity?.capacityUnits ?? 0;
        const booked = capacity?.bookedUnits ?? 0;
        const isFull = displayCapacity > 0 && booked >= displayCapacity;
        const isPartial = displayCapacity > 0 && booked >= displayCapacity * 0.8;

        return (
          <div
            key={week.isoWeek}
            className="border-b-[1.5px] border-r-[1.5px] border-b-nb-gray-200 border-r-nb-gray-300 p-2 last:border-r-0"
          >
            <div className="space-y-1">
              {/* Capacity input (editable) or display */}
              {canEdit ? (
                <input
                  type="number"
                  min="0"
                  value={displayCapacity}
                  onChange={(e) => onCapacityChange(week.isoWeek, serviceType, e.target.value)}
                  className="h-6 w-full border-[1.5px] border-nb-gray-300 px-1 text-center font-mono text-[10px]"
                  title={t('common:actions.capacity')}
                />
              ) : (
                <div className="text-center font-mono text-[10px] font-bold text-nb-black">
                  {displayCapacity}
                </div>
              )}

              {/* Booked / capacity display and progress bar */}
              <div className="text-center font-mono text-[9px] text-nb-gray-600">
                {booked}/{displayCapacity}
              </div>

              {/* Progress bar */}
              {displayCapacity > 0 ? (
                <div className="h-1.5 rounded-nb-sm border-[1px] border-nb-gray-300 bg-nb-gray-100">
                  <div
                    className={cn(
                      'h-full rounded-nb-sm transition-all',
                      isFull
                        ? 'bg-nb-danger'
                        : isPartial
                          ? 'bg-nb-warning'
                          : 'bg-nb-success',
                    )}
                    style={{ width: `${Math.min(100, (booked / displayCapacity) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="h-1.5 rounded-nb-sm border-[1px] border-dashed border-nb-gray-300 bg-nb-gray-50" />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
