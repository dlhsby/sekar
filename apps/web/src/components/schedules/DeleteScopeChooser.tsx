'use client';

import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, Button } from '@/components/ui';
import type { EditScope } from '@/lib/api/schedule-events';

interface DeleteScopeChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: EditScope, date?: string) => void;
  selectedDate?: string;
  /** When true, hide the 'this' (Hanya hari ini) option (for projected occurrences). */
  hideThisOption?: boolean;
}

export function DeleteScopeChooser({
  open,
  onOpenChange,
  onSelect,
  selectedDate,
  hideThisOption = false,
}: DeleteScopeChooserProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('schedules:calendar.deleteScope.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-nb-gray-600">{t('schedules:calendar.deleteScope.confirm')}</p>
          <div className="space-y-2">
            {!hideThisOption && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onSelect('this', selectedDate);
                  onOpenChange(false);
                }}
              >
                <div className="text-left">
                  <div className="font-bold">{t('schedules:calendar.deleteScope.this')}</div>
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onSelect('this_and_future', selectedDate);
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.deleteScope.thisAndFuture')}</div>
              </div>
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                onSelect('series');
                onOpenChange(false);
              }}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.deleteScope.series')}</div>
              </div>
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
