'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, DatePicker, Field } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { useLiveUsers, useReassignWorker } from '@/lib/api/monitoring';
import type { BoundariesResponse, LiveUser } from '@/lib/api/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { STATUS_BADGE_CLASSES, getStatusLabels } from '@/lib/constants/monitoring';
import { todayJakartaISODate } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/models';
import { toast } from 'sonner';
import { Users, ArrowRightLeft } from 'lucide-react';

export interface ReassignWorkerModalProps {
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

export function ReassignWorkerModal({
  open,
  onOpenChange,
  targetAreaId,
  targetAreaName,
  boundaries,
}: ReassignWorkerModalProps) {
  const { t } = useTranslation(['monitoring']);
  const statusLabels = getStatusLabels();
  const [sourceAreaId, setSourceAreaId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(todayJakartaISODate());

  const siblingAreas = getSiblingAreas(boundaries, targetAreaId);

  const { data: liveUsersData, isLoading: usersLoading } = useLiveUsers(
    sourceAreaId ? { location_id: sourceAreaId } : undefined
  );

  const workers: LiveUser[] = sourceAreaId
    ? (liveUsersData?.users ?? []).filter((u) => u.location_id === sourceAreaId)
    : [];

  const reassignMutation = useReassignWorker();

  function handleClose() {
    setSourceAreaId('');
    setSelectedUserId('');
    setReason('');
    setEffectiveDate(todayJakartaISODate());
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!selectedUserId) return;
    try {
      await reassignMutation.mutateAsync({
        user_id: selectedUserId,
        target_area_id: targetAreaId,
        reason: reason || undefined,
        effective_date: effectiveDate,
        end_current_schedule: true,
      });
      toast.success(t('monitoring:reassign.successMessage'));
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('monitoring:reassign.errorMessage');
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-nb-primary" />
            {t('monitoring:reassignModal.title', { area: targetAreaName })}
          </DialogTitle>
          <DialogDescription>{t('monitoring:reassignModal.description')}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Source area selector */}
          <div className="space-y-1.5">
            <label htmlFor="source-area" className="text-sm font-bold text-nb-black">
              {t('monitoring:reassignModal.sourceAreaLabel')}
            </label>
            <select
              id="source-area"
              value={sourceAreaId}
              onChange={(e) => {
                setSourceAreaId(e.target.value);
                setSelectedUserId('');
              }}
              className={cn(
                'w-full h-12 px-3 text-sm font-medium rounded-nb-base',
                'border-2 border-nb-black bg-nb-white text-nb-black',
                'shadow-nb-md focus:outline-none focus:ring-2 focus:ring-nb-primary focus:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <option value="">{t('monitoring:reassignModal.sourceAreaPlaceholder')}</option>
              {siblingAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {siblingAreas.length === 0 && (
              <p className="text-xs text-nb-gray-500">{t('monitoring:reassignModal.noOtherAreas')}</p>
            )}
          </div>

          {/* Worker list */}
          {sourceAreaId && (
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-nb-black flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {t('monitoring:reassignModal.selectLabel')}
              </p>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-nb-base bg-nb-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <p className="text-xs text-nb-gray-500 py-2">
                  {t('monitoring:reassignModal.noActiveWorkers')}
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {workers.map((user) => {
                    const isSelected = selectedUserId === user.id;
                    const statusClass =
                      STATUS_BADGE_CLASSES[user.status] ??
                      'bg-nb-gray-100 text-nb-gray-700 border-nb-gray-300';
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-nb-base text-left',
                            'border-2 transition-all duration-100',
                            isSelected
                              ? 'border-nb-primary bg-nb-primary/10 shadow-nb-sm'
                              : 'border-nb-black bg-nb-white hover:bg-nb-gray-50 shadow-nb-xs'
                          )}
                          aria-pressed={isSelected}
                        >
                          <span
                            className={cn(
                              'h-4 w-4 rounded-full border-2 flex-shrink-0',
                              isSelected
                                ? 'border-nb-primary bg-nb-primary'
                                : 'border-nb-gray-400 bg-nb-white'
                            )}
                          />
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
                            {statusLabels[user.status] ?? user.status}
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
            <label htmlFor="reason" className="text-sm font-bold text-nb-black">
              {t('monitoring:reassignModal.reasonLabel')}{' '}
              <span className="font-normal text-nb-gray-500">{t('monitoring:reassignModal.optional')}</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('monitoring:reassignModal.reasonPlaceholder')}
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
          <Field label={t('monitoring:reassignModal.effectiveDateLabel')}>
            {(p) => (
              <DatePicker
                id={p.id}
                value={effectiveDate || undefined}
                onValueChange={(v) => setEffectiveDate(v ?? '')}
              />
            )}
          </Field>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={reassignMutation.isPending}
          >
            {t('monitoring:reassignModal.cancelButton')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedUserId || reassignMutation.isPending}
            loading={reassignMutation.isPending}
          >
            {t('monitoring:reassignModal.reassignButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
