'use client';

import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, Button } from '@/components/ui';
import type { EditScope } from '@/lib/api/schedule-events';

interface EditScopeChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: EditScope, fromDate?: string) => void;
  /** When set, a destructive delete entry hands off to the delete-scope flow. */
  onDelete?: () => void;
  selectedDate?: string;
}

export function EditScopeChooser({
  open,
  onOpenChange,
  onSelect,
  onDelete,
  selectedDate,
}: EditScopeChooserProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('schedules:calendar.editScope.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onSelect('this');
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.editScope.this')}</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onSelect('this_and_future', selectedDate);
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.editScope.thisAndFuture')}</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onSelect('series');
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.editScope.series')}</div>
              </div>
            </Button>
          </div>
        </DialogBody>
        <DialogFooter className="justify-between">
          {onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            >
              {t('common:actions.delete')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
