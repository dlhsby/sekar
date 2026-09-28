'use client';

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { useEntityHistory } from '@/lib/api/audit';
import { AuditEntryDetail } from './AuditEntryDetail';

export interface EntityHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Audit entity type, e.g. 'district', 'user', 'team_category'. */
  entityType: string;
  entityId: string | null;
  name: string;
}

/** "Riwayat" — the full change timeline of one record, newest first (ADR-061). */
export function EntityHistoryDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  name,
}: EntityHistoryDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useEntityHistory(entityType, entityId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('admin:audit.history.title', { name })}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
          {isLoading && <Skeleton variant="card" />}
          {isError && <EmptyState variant="error" title={t('admin:audit.history.loadError')} />}
          {data && data.length === 0 && (
            <EmptyState variant="noData" title={t('admin:audit.history.empty')} />
          )}
          {data?.map((entry) => (
            <article key={entry.id} className="border-2 border-nb-black p-3 shadow-nb-xs">
              <AuditEntryDetail entry={entry} />
            </article>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
