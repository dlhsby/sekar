'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import { actorName, type AuditEntry } from '@/lib/api/audit';
import { roleLabel } from '@/lib/constants/roles';
import { AuditDiff, AuditSnapshot } from './AuditDiff';
import { actionLabel, entityTypeLabel, formatAuditTime, formatAuditValue } from './audit-format';

const OUTCOME_VARIANT = { success: 'success', denied: 'destructive', failed: 'warning' } as const;

/** Everything recorded about one audit entry: who, what, when, the diff and the request. */
export function AuditEntryDetail({ entry }: { entry: AuditEntry }) {
  const { t, i18n } = useTranslation();
  const actor = actorName(entry);
  const role = entry.actor_role ?? entry.actor?.role ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={OUTCOME_VARIANT[entry.outcome] ?? 'secondary'} size="sm">
          {t(`admin:audit.outcome.${entry.outcome}`)}
        </Badge>
        <span className="font-bold">{actionLabel(t, entry.action)}</span>
        <span className="text-nb-gray-600">·</span>
        <span>{entityTypeLabel(t, entry.entity_type)}</span>
        {entry.entity_label && <span className="font-semibold">“{entry.entity_label}”</span>}
      </div>

      <p className="text-nb-body-sm text-nb-gray-700">
        {formatAuditTime(entry.created_at, i18n.language)} ·{' '}
        {actor ? `${actor}${role ? ` (${roleLabel(role)})` : ''}` : t('admin:audit.system')}
      </p>

      {entry.reason && (
        <section className="space-y-1">
          <h3 className="text-nb-body-sm font-bold">{t('admin:audit.detail.reason')}</h3>
          <p className="border-2 border-nb-black bg-nb-warning-light p-2 text-nb-body-sm">{entry.reason}</p>
        </section>
      )}

      {entry.changes && Object.keys(entry.changes).length > 0 && <AuditDiff changes={entry.changes} />}
      {entry.new_value && (
        <AuditSnapshot title={t('admin:audit.detail.snapshotCreated')} snapshot={entry.new_value} />
      )}
      {entry.old_value && (
        <AuditSnapshot title={t('admin:audit.detail.snapshotDeleted')} snapshot={entry.old_value} />
      )}
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <AuditSnapshot title={t('admin:audit.detail.metadata')} snapshot={entry.metadata} />
      )}

      <section className="space-y-1">
        <h3 className="text-nb-body-sm font-bold">{t('admin:audit.detail.request')}</h3>
        <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-1 text-nb-body-sm">
          <dt className="text-nb-gray-700">{t('admin:audit.detail.ip')}</dt>
          <dd>{formatAuditValue(t, entry.ip)}</dd>
          <dt className="text-nb-gray-700">{t('admin:audit.detail.userAgent')}</dt>
          <dd className="break-all">{formatAuditValue(t, entry.user_agent)}</dd>
          <dt className="text-nb-gray-700">{t('admin:audit.detail.requestId')}</dt>
          <dd className="font-mono text-nb-mono-sm">{formatAuditValue(t, entry.request_id)}</dd>
          <dt className="text-nb-gray-700">{t('admin:audit.detail.hash')}</dt>
          <dd className="font-mono text-nb-mono-sm break-all">{formatAuditValue(t, entry.hash)}</dd>
          {entry.parent_id && (
            <>
              <dt className="text-nb-gray-700">{t('admin:audit.detail.parent')}</dt>
              <dd className="font-mono text-nb-mono-sm">{entry.parent_id}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
