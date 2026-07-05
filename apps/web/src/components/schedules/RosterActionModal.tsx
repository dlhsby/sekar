'use client';

import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

interface RosterActionModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
  submitDisabled?: boolean;
  /** Inline error banner (mutation failure) — shown above the fields. */
  error?: string | false;
  children: React.ReactNode;
}

/**
 * RosterActionModal — a small edit dialog for the daily-roster row actions
 * (leave / replace / areas / shift). Uses the shared Dialog chrome + an inline
 * error banner so it matches the Rayon/Area/User form modals.
 */
export function RosterActionModal({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel,
  loading = false,
  submitDisabled = false,
  error,
  children,
}: RosterActionModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {error ? (
            <div
              className="mb-4 border-2 border-nb-danger bg-nb-danger-light px-4 py-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-nb-body-sm font-medium text-nb-danger">{error}</p>
            </div>
          ) : null}
          <div className="space-y-4">{children}</div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSubmit} loading={loading} disabled={submitDisabled || loading}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
