'use client';

/**
 * Form Actions Footer Component
 * Shared submit button pattern for forms
 */

import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui';

export interface FormActionsProps {
  /** Ignored when `readOnly` is true. */
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  /** Read-only "Detail" mode — renders a single "Close" button instead of Cancel + Submit. */
  readOnly?: boolean;
}

export function FormActions({
  submitLabel,
  loading = false,
  disabled = false,
  onCancel,
  readOnly = false,
}: FormActionsProps) {
  const { t } = useTranslation();

  if (readOnly) {
    return (
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
          {t('common:actions.close')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 pt-4">
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="w-full"
        >
          {t('admin:shared.cancel')}
        </Button>
      )}
      <Button
        type="submit"
        loading={loading}
        disabled={loading || disabled}
        className="w-full"
        leftIcon={<Save className="w-5 h-5" />}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
