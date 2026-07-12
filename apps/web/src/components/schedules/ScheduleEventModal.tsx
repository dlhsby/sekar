'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, Button } from '@/components/ui';
import { useCreateScheduleEvent, useUpdateScheduleEvent, type UpdateScheduleEventInput, type EditScope, type ScheduleEvent } from '@/lib/api/schedule-events';
import { usePermissions } from '@/lib/auth/usePermissions';

export interface ScheduleEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent;
  editScope?: EditScope;
  fromDate?: string;
  initialDate?: string;
  onSuccess?: () => void;
}

export function ScheduleEventModal({
  open,
  onOpenChange,
  event,
  editScope,
  fromDate,
  initialDate,
  onSuccess,
}: ScheduleEventModalProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();

  const isEditing = !!event;
  const canCreate = can('schedule:create');
  const canUpdate = can('schedule:update');
  const isDisabled = isEditing ? !canUpdate : !canCreate;

  const createMutation = useCreateScheduleEvent();
  const updateMutation = useUpdateScheduleEvent();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isDisabled) {
      toast.error(t('common:unauthorized'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && event) {
        const updateData: UpdateScheduleEventInput = {
          notes: 'Updated via calendar',
        };

        const result = await updateMutation.mutateAsync({
          id: event.id,
          input: updateData,
          editScope: editScope || 'series',
          fromDate: fromDate,
        });

        if (result.materialization.skipped.length > 0) {
          const conflictList = result.materialization.skipped
            .map((s) =>
              t('schedules:calendar.conflicts.worker', {
                name: s.user_name,
                date: s.date
              })
            )
            .join('\n');
          toast.warning(`${t('schedules:calendar.conflicts.message')}\n\n${conflictList}`);
        } else {
          toast.success(t('schedules:messages.editSuccess'));
        }
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(isEditing ? t('schedules:messages.areasError') : t('schedules:messages.areasError'));
      console.error('Schedule event error:', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('schedules:calendar.event.editTitle')
              : t('schedules:calendar.event.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="event-form" className="space-y-4" onSubmit={handleSubmit}>
            <div className="p-4 rounded-nb-base border-2 border-nb-gray-200 bg-nb-gray-50">
              <p className="text-nb-body-sm text-nb-gray-600">
                {t('schedules:calendar.event.formNotice')}
              </p>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('schedules:calendar.event.cancel')}
          </Button>
          <Button
            form="event-form"
            type="submit"
            disabled={isDisabled || isSubmitting}
          >
            {t('schedules:calendar.event.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
