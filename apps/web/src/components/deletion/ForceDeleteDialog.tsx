'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormInput,
  FormSelect,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import {
  useDeletionImpact,
  useForceDelete,
  type DeletableType,
} from '@/lib/api/deletions';

/** Mirrors ForceDeleteDto `reason` @MinLength(5). */
const REASON_MIN = 5;

export interface ReplacementOption {
  value: string;
  label: string;
}

export interface ForceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DeletableType;
  id: string | null;
  /** Display name for the title (the confirm text comes from the server). */
  name: string;
  /** Candidates to move dependants to (roles, location types). */
  replacementOptions?: ReplacementOption[];
  onDeleted?: () => void;
}

const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');

/**
 * Force delete of an in-use record (ADR-062). Shows exactly what will be
 * removed or changed, warns that it cannot be undone, and requires the record
 * name typed back plus a reason (stored on the audit trail). Past attendance
 * and reports are never touched — only the future is cancelled.
 */
export function ForceDeleteDialog({
  open,
  onOpenChange,
  type,
  id,
  name,
  replacementOptions = [],
  onDeleted,
}: ForceDeleteDialogProps) {
  const { t } = useTranslation();
  const impactQuery = useDeletionImpact(type, id, open);
  const forceDelete = useForceDelete(type);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [replacement, setReplacement] = useState('');

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time it opens
    setTyped('');
    setReason('');
    setReplacement('');
  }, [open, id]);

  const view = impactQuery.data;
  const counts = Object.entries(view?.impact ?? {}).filter(([, n]) => n > 0);
  const needsReplacement = (view?.replacement_required ?? 0) > 0;
  const nameMatches = !!view && normalise(typed) === normalise(view.confirm_label);
  const reasonOk = reason.trim().length >= REASON_MIN;
  const canSubmit =
    nameMatches && reasonOk && (!needsReplacement || !!replacement) && !forceDelete.isPending;

  const submit = async () => {
    if (!id || !canSubmit) return;
    try {
      await forceDelete.mutateAsync({
        id,
        payload: {
          confirm_name: typed,
          reason: reason.trim(),
          ...(needsReplacement ? { replacement_id: replacement } : {}),
        },
      });
      toast.success(t('common:forceDelete.success', { name }));
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !forceDelete.isPending && onOpenChange(next)}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t('common:forceDelete.title', { name })}</DialogTitle>
          <DialogDescription>{t('common:forceDelete.description')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div
            role="alert"
            className="flex gap-3 rounded-nb-base border-2 border-nb-black bg-nb-danger-light p-3"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
            <div className="space-y-1 text-nb-body-sm">
              <p className="font-bold">{t('common:forceDelete.warningTitle')}</p>
              <p>{t('common:forceDelete.historyKept')}</p>
            </div>
          </div>

          <section aria-label={t('common:forceDelete.impactTitle')} className="space-y-2">
            <p className="text-nb-body-sm font-bold">{t('common:forceDelete.impactTitle')}</p>
            {impactQuery.isLoading && <Skeleton variant="text" />}
            {impactQuery.isError && (
              <p className="text-nb-body-sm text-nb-danger-dark">{getErrorMessage(impactQuery.error)}</p>
            )}
            {view && counts.length === 0 && (
              <p className="text-nb-body-sm text-nb-gray-600">{t('common:forceDelete.noImpact')}</p>
            )}
            {counts.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-nb-body-sm">
                {counts.map(([key, n]) => (
                  <li key={key}>{t(`common:forceDelete.impact.${key}`, { count: n })}</li>
                ))}
              </ul>
            )}
          </section>

          {needsReplacement && (
            <FormSelect
              label={t('common:forceDelete.replacementLabel')}
              helperText={t('common:forceDelete.replacementHint', {
                count: view?.replacement_required ?? 0,
              })}
              options={replacementOptions.filter((o) => o.value !== id)}
              value={replacement}
              onChange={setReplacement}
              placeholder={t('common:forceDelete.replacementPlaceholder')}
              required
            />
          )}

          <FormInput
            label={t('common:forceDelete.confirmLabel', { name: view?.confirm_label ?? name })}
            placeholder={view?.confirm_label ?? ''}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            disabled={!view}
          />

          <div className="space-y-1.5">
            <label htmlFor="force-delete-reason" className="block text-nb-body-sm font-semibold">
              {t('common:forceDelete.reasonLabel')}
            </label>
            <Textarea
              id="force-delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('common:forceDelete.reasonPlaceholder')}
              rows={3}
              maxLength={500}
            />
            {reason.length > 0 && !reasonOk && (
              <p className="text-nb-body-sm font-medium text-nb-danger">
                {t('validation:minLength', { count: REASON_MIN })}
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={forceDelete.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!canSubmit} loading={forceDelete.isPending}>
            {t('common:forceDelete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
