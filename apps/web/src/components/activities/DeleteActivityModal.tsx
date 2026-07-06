'use client';

/**
 * Delete Activity Modal Component
 * Confirmation dialog for deleting an activity
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog, Badge } from '@/components/ui';
import { useDeleteActivity } from '@/lib/api/activities';
import { getErrorMessage } from '@/lib/api/client';
import { getActivityStatusLabels, ACTIVITY_STATUS_BADGES } from '@/lib/constants/activities';
import type { Activity } from '@/types/models';

export interface DeleteActivityModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteActivityModal({
  activity,
  isOpen,
  onClose,
  onSuccess,
}: DeleteActivityModalProps) {
  const { t } = useTranslation();
  const deleteActivity = useDeleteActivity();
  const [error, setError] = useState<string | null>(null);
  const activityLabels = getActivityStatusLabels();

  const handleDelete = async () => {
    if (!activity) return;

    setError(null);

    try {
      await deleteActivity.mutateAsync(activity.id);
      toast.success(t('activities:successDeleted'));
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <ConfirmDialog
      open={isOpen && !!activity}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      title={t('activities:deleteTitle')}
      description={t('activities:deleteConfirmation')}
      confirmLabel={t('common:actions.delete')}
      variant="destructive"
      loading={deleteActivity.isPending}
      onConfirm={handleDelete}
    >
      {/* Activity Details */}
      <div className="space-y-2">
        <div className="bg-nb-gray-100 border-2 border-nb-black p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">{t('activities:list.table.columns.user')}:</span>
            <span>{activity?.user?.full_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('activities:list.table.columns.activityType')}:</span>
            <span>{activity?.activity_type?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('activities:list.table.columns.status')}:</span>
            <Badge
              variant={ACTIVITY_STATUS_BADGES[activity?.status ?? 'pending']}
              size="sm"
            >
              {activityLabels[activity?.status ?? 'pending']}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('activities:list.table.columns.date')}:</span>
            <span>{new Date(activity?.created_at ?? '').toLocaleDateString()}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
            <p className="text-sm text-nb-danger font-medium">{error}</p>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
