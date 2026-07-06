'use client';

/**
 * Form Actions — shared Cancel/Submit button pair, rendered as bare buttons
 * (no wrapping div/padding) so it drops directly into a Dialog's
 * `<DialogFooter>`. That footer stays fixed at the bottom of the dialog
 * (see `components/ui/dialog.tsx`) while the form body scrolls above it —
 * pass `formId` matching the `<form id=...>` so Submit still triggers the
 * right form despite living outside it in the DOM.
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';

export interface FormActionsProps {
  /** Ignored when `readOnly` is true. */
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  /** Read-only "Detail" mode — renders a single "Close" button instead of Cancel + Submit. */
  readOnly?: boolean;
  /** Matches the target `<form id=...>` — required unless FormActions is rendered inside that form. */
  formId?: string;
}

export function FormActions({
  submitLabel,
  loading = false,
  disabled = false,
  onCancel,
  readOnly = false,
  formId,
}: FormActionsProps) {
  const { t } = useTranslation();

  if (readOnly) {
    return (
      <Button type="button" variant="outline" onClick={onCancel}>
        {t('common:actions.close')}
      </Button>
    );
  }

  return (
    <>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('admin:shared.cancel')}
        </Button>
      )}
      <Button type="submit" form={formId} variant="default" loading={loading} disabled={loading || disabled}>
        {submitLabel}
      </Button>
    </>
  );
}
