'use client';

import { useTranslation } from 'react-i18next';
import { formatAuditValue } from './audit-format';

interface AuditDiffProps {
  changes: Record<string, [unknown, unknown]>;
}

/** Field-by-field "before → after" table for an update. */
export function AuditDiff({ changes }: AuditDiffProps) {
  const { t } = useTranslation();
  const rows = Object.entries(changes);
  return (
    <table className="w-full border-2 border-nb-black text-nb-body-sm">
      <thead className="bg-nb-gray-100">
        <tr>
          <th className="border-b-2 border-nb-black p-2 text-left">{t('admin:audit.detail.field')}</th>
          <th className="border-b-2 border-nb-black p-2 text-left">{t('admin:audit.detail.before')}</th>
          <th className="border-b-2 border-nb-black p-2 text-left">{t('admin:audit.detail.after')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([field, [before, after]]) => (
          <tr key={field} className="align-top">
            <td className="border-t border-nb-gray-300 p-2 font-mono text-nb-mono-sm">{field}</td>
            <td className="border-t border-nb-gray-300 p-2 break-all text-nb-danger-dark line-through decoration-1">
              {formatAuditValue(t, before)}
            </td>
            <td className="border-t border-nb-gray-300 p-2 break-all text-nb-success-dark">
              {formatAuditValue(t, after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface AuditSnapshotProps {
  title: string;
  snapshot: Record<string, unknown>;
}

/** Key/value table for a full snapshot (record as created / last state before delete). */
export function AuditSnapshot({ title, snapshot }: AuditSnapshotProps) {
  const { t } = useTranslation();
  return (
    <section className="space-y-1">
      <h3 className="text-nb-body-sm font-bold">{title}</h3>
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-1 border-2 border-nb-black p-2 text-nb-body-sm">
        {Object.entries(snapshot).map(([field, value]) => (
          <div key={field} className="contents">
            <dt className="font-mono text-nb-mono-sm text-nb-gray-700">{field}</dt>
            <dd className="break-all">{formatAuditValue(t, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
