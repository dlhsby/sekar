'use client';

/**
 * Form Actions Footer Component
 * Shared submit button pattern for forms
 */

import { Save } from 'lucide-react';
import { Button } from '@/components/ui';

export interface FormActionsProps {
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
}

export function FormActions({
  submitLabel,
  loading = false,
  disabled = false,
  onCancel,
}: FormActionsProps) {
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
          Batal
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
