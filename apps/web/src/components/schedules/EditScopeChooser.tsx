'use client';

import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, Button } from '@/components/ui';
import type { EditScope } from '@/lib/api/schedule-events';

interface EditScopeChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: EditScope, fromDate?: string) => void;
  /**
   * The scope currently being applied, if any. Answering this dialog is what
   * WRITES the edit (the form only collects it), so the choice has to show
   * progress and stay un-double-clickable while the request is in flight.
   */
  pendingScope?: EditScope | null;
  /** When set, a destructive delete entry hands off to the delete-scope flow. */
  onDelete?: () => void;
  selectedDate?: string;
  /** When true, hide the 'this' (Hanya hari ini) option (for projected occurrences). */
  hideThisOption?: boolean;
}

export function EditScopeChooser({
  open,
  onOpenChange,
  onSelect,
  onDelete,
  selectedDate,
  hideThisOption = false,
  pendingScope = null,
}: EditScopeChooserProps) {
  const { t } = useTranslation();
  const busy = pendingScope != null;

  return (
    <Dialog
      open={open}
      // A write is in flight — an outside click or Esc here would orphan it.
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('schedules:calendar.editScope.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-2">
            {!hideThisOption && (
              <Button
                variant="outline"
                className="w-full justify-start"
                loading={pendingScope === 'this'}
                disabled={busy}
                onClick={() => onSelect('this')}
              >
                <div className="text-left">
                  <div className="font-bold">{t('schedules:calendar.editScope.this')}</div>
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start"
              loading={pendingScope === 'this_and_future'}
              disabled={busy}
              onClick={() => onSelect('this_and_future', selectedDate)}
            >
              <div className="text-left">
                <div className="font-bold">{t('schedules:calendar.editScope.thisAndFuture')}</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              loading={pendingScope === 'series'}
              disabled={busy}
              onClick={() => onSelect('series')}
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
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            >
              {t('common:actions.delete')}
            </Button>
          )}
          {/* Cancel DISCARDS the pending edit — nothing has been written yet. */}
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
