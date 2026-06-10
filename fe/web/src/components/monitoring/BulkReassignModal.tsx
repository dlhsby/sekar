'use client';

/**
 * BulkReassignModal — multi-worker reassignment (Phase 4-4 B1).
 * Same flow as ReassignWorkerModal but with checkbox multi-select and a
 * sequential submit loop against the single-worker endpoint. Partial failures
 * keep the modal open with only the failed workers still selected for retry.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { useLiveUsers, useReassignWorker } from '@/lib/api/monitoring';
import type { BoundariesResponse, LiveUser } from '@/lib/api/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/constants/monitoring';
import { todayJakartaISODate } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/models';
import { toast } from 'sonner';
import { Users, ArrowRightLeft, Check } from 'lucide-react';

export interface BulkReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetAreaId: string;
  targetAreaName: string;
  boundaries?: BoundariesResponse;
}

/** Derive sibling areas (same rayon) excluding the target area */
function getSiblingAreas(
  boundaries: BoundariesResponse | undefined,
  targetAreaId: string
): { id: string; name: string; rayonName: string }[] {
  if (!boundaries) return [];
  const results: { id: string; name: string; rayonName: string }[] = [];
  for (const rayon of boundaries.rayons) {
    const hasTarget = rayon.areas.some((a) => a.id === targetAreaId);
    if (!hasTarget) continue;
    for (const area of rayon.areas) {
      if (area.id !== targetAreaId) {
        results.push({ id: area.id, name: area.name, rayonName: rayon.name });
      }
    }
  }
  return results;
}

export function BulkReassignModal({
  open,
  onOpenChange,
  targetAreaId,
  targetAreaName,
  boundaries,
}: BulkReassignModalProps) {
  const [sourceAreaId, setSourceAreaId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<ReadonlySet<string>>(new Set());
  const [reason, setReason] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(todayJakartaISODate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const siblingAreas = getSiblingAreas(boundaries, targetAreaId);

  const { data: liveUsersData, isLoading: usersLoading } = useLiveUsers(
    sourceAreaId ? { area_id: sourceAreaId } : undefined
  );

  const workers: LiveUser[] = sourceAreaId
    ? (liveUsersData?.users ?? []).filter((u) => u.area_id === sourceAreaId)
    : [];

  const reassignMutation = useReassignWorker();

  const allSelected = workers.length > 0 && workers.every((w) => selectedUserIds.has(w.id));

  function toggleWorker(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    setSelectedUserIds(allSelected ? new Set() : new Set(workers.map((w) => w.id)));
  }

  function handleClose() {
    setSourceAreaId('');
    setSelectedUserIds(new Set());
    setReason('');
    setEffectiveDate(todayJakartaISODate());
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (selectedUserIds.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const failedIds: string[] = [];
    let successCount = 0;

    try {
      for (const userId of selectedUserIds) {
        try {
          await reassignMutation.mutateAsync({
            user_id: userId,
            target_area_id: targetAreaId,
            reason: reason || undefined,
            effective_date: effectiveDate,
            end_current_schedule: true,
          });
          successCount += 1;
        } catch {
          failedIds.push(userId);
        }
      }

      if (failedIds.length === 0) {
        toast.success(`${successCount} petugas berhasil dipindahkan`);
        handleClose();
      } else if (successCount > 0) {
        toast.error(`${successCount} petugas berhasil dipindahkan, ${failedIds.length} gagal`);
        setSelectedUserIds(new Set(failedIds));
      } else {
        toast.error('Gagal memindahkan petugas');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-nb-primary" />
            Pindah Massal ke {targetAreaName}
          </DialogTitle>
          <DialogDescription>
            Pilih beberapa petugas dari area lain untuk dipindahkan sekaligus
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2 space-y-4">
          {/* Source area selector */}
          <div className="space-y-1.5">
            <label htmlFor="bulk-source-area" className="text-sm font-bold text-nb-black">
              Area Asal
            </label>
            <select
              id="bulk-source-area"
              value={sourceAreaId}
              onChange={(e) => {
                setSourceAreaId(e.target.value);
                setSelectedUserIds(new Set());
              }}
              className={cn(
                'w-full h-12 px-3 text-sm font-medium rounded-nb-base',
                'border-2 border-nb-black bg-nb-white text-nb-black',
                'shadow-nb-md focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <option value="">-- Pilih area asal --</option>
              {siblingAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {siblingAreas.length === 0 && (
              <p className="text-xs text-nb-gray-500">Tidak ada area lain dalam rayon yang sama.</p>
            )}
          </div>

          {/* Worker multi-select list */}
          {sourceAreaId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-nb-black flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Pilih Petugas
                  {selectedUserIds.size > 0 && (
                    <span className="text-xs font-semibold text-nb-gray-500">
                      ({selectedUserIds.size} dipilih)
                    </span>
                  )}
                </p>
                {workers.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-bold text-nb-primary-active hover:underline"
                  >
                    {allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-nb-base bg-nb-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <p className="text-xs text-nb-gray-500 py-2">
                  Tidak ada petugas aktif di area ini.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {workers.map((user) => {
                    const isSelected = selectedUserIds.has(user.id);
                    const statusClass =
                      STATUS_BADGE_CLASSES[user.status] ??
                      'bg-nb-gray-100 text-nb-gray-700 border-nb-gray-300';
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => toggleWorker(user.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-nb-base text-left',
                            'border-2 transition-all duration-100',
                            isSelected
                              ? 'border-nb-primary bg-nb-primary/10 shadow-nb-sm'
                              : 'border-nb-black bg-nb-white hover:bg-nb-gray-50 shadow-nb-xs'
                          )}
                        >
                          <span
                            className={cn(
                              'h-4 w-4 rounded-nb-sm border-2 flex-shrink-0 flex items-center justify-center',
                              isSelected
                                ? 'border-nb-primary bg-nb-primary'
                                : 'border-nb-gray-400 bg-nb-white'
                            )}
                            aria-hidden="true"
                          >
                            {isSelected && <Check className="h-3 w-3 text-nb-white" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-nb-black truncate">
                              {user.full_name}
                            </span>
                            <span className="text-xs text-nb-gray-500">
                              {ROLE_LABELS[user.role as UserRole] ?? user.role}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'flex-shrink-0 text-xs font-semibold border px-2 py-0.5 rounded-nb-sm',
                              statusClass
                            )}
                          >
                            {STATUS_LABELS[user.status] ?? user.status}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label htmlFor="bulk-reason" className="text-sm font-bold text-nb-black">
              Alasan <span className="font-normal text-nb-gray-500">(opsional)</span>
            </label>
            <textarea
              id="bulk-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan alasan pemindahan..."
              rows={2}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-nb-base resize-none',
                'border-2 border-nb-black bg-nb-white text-nb-black',
                'shadow-nb-md focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1',
                'placeholder:text-nb-gray-400'
              )}
            />
          </div>

          {/* Effective date */}
          <div className="space-y-1.5">
            <label htmlFor="bulk-effective-date" className="text-sm font-bold text-nb-black">
              Tanggal Berlaku
            </label>
            <input
              id="bulk-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className={cn(
                'w-full h-12 px-3 text-sm rounded-nb-base',
                'border-2 border-nb-black bg-nb-white text-nb-black',
                'shadow-nb-md focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1'
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={selectedUserIds.size === 0 || isSubmitting}
            loading={isSubmitting}
          >
            {selectedUserIds.size > 0
              ? `Pindahkan ${selectedUserIds.size} Petugas`
              : 'Pindahkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
