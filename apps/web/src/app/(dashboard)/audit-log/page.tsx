'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  DateRangePicker,
  EmptyState,
  FormInput,
  FormSelect,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';
import { useRoles } from '@/lib/api/roles';
import {
  actorName,
  downloadAuditCsv,
  useAuditLogs,
  useAuditTypes,
  useAuditVerify,
  type AuditEntry,
  type AuditFilters,
} from '@/lib/api/audit';
import { roleLabel } from '@/lib/constants/roles';
import { AuditEntryDetail } from '@/components/audit/AuditEntryDetail';
import {
  actionLabel,
  changedFieldCount,
  entityTypeLabel,
  formatAuditTime,
} from '@/components/audit/audit-format';

const PAGE_SIZE = 50;
const ALL = 'all';
/** Explicitly logged event types, shown in the filter next to the auto-captured ones. */
const EVENT_TYPES = ['auth', 'http', 'audit_log', 'schedule_event', 'task', 'activity', 'overtime', 'shift'];
const ACTIONS = [
  'create',
  'update',
  'delete',
  'restore',
  'purge',
  'force_delete',
  'permissions_change',
  'locations_change',
  'login',
  'login_failed',
  'logout',
  'denied_write',
  'export',
];
const OUTCOME_VARIANT = { success: 'success', denied: 'destructive', failed: 'warning' } as const;

/** 'all' sentinel → undefined filter. */
const pick = (v: string) => (v === ALL ? undefined : v);

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const canRead = can('audit:read');

  const [range, setRange] = useState({ from: '', to: '' });
  const [entityType, setEntityType] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [outcome, setOutcome] = useState(ALL);
  const [actorRole, setActorRole] = useState(ALL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());

  const filters = useMemo<AuditFilters>(
    () => ({
      entity_type: pick(entityType),
      action: pick(action),
      outcome: pick(outcome) as AuditFilters['outcome'],
      actor_role: pick(actorRole),
      q: q || undefined,
      // Inclusive whole days in local time.
      from_date: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : undefined,
      to_date: range.to ? new Date(`${range.to}T23:59:59.999`).toISOString() : undefined,
    }),
    [entityType, action, outcome, actorRole, q, range],
  );
  // Any filter change starts again at page 1.
  useEffect(() => setPage(1), [filters]);

  const logs = useAuditLogs(filters, page, PAGE_SIZE);
  const { data: autoTypes = [] } = useAuditTypes();
  const { data: roles = [] } = useRoles();
  const chain = useAuditVerify(verifying);

  const typeOptions = useMemo(
    () => [
      { value: ALL, label: t('admin:audit.filters.all') },
      ...[...new Set([...autoTypes, ...EVENT_TYPES])].map((type) => ({
        value: type,
        label: entityTypeLabel(t, type),
      })),
    ],
    [autoTypes, t],
  );
  const actionOptions = useMemo(
    () => [
      { value: ALL, label: t('admin:audit.filters.all') },
      ...ACTIONS.map((a) => ({ value: a, label: actionLabel(t, a) })),
    ],
    [t],
  );
  const outcomeOptions = useMemo(
    () => [
      { value: ALL, label: t('admin:audit.filters.all') },
      ...(['success', 'denied', 'failed'] as const).map((o) => ({
        value: o,
        label: t(`admin:audit.outcome.${o}`),
      })),
    ],
    [t],
  );
  const roleOptions = useMemo(
    () => [
      { value: ALL, label: t('admin:audit.filters.all') },
      ...roles.map((r) => ({ value: r.code, label: r.name })),
    ],
    [roles, t],
  );

  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      {
        id: 'time',
        header: t('admin:audit.columns.time'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatAuditTime(row.original.created_at, i18n.language)}</span>
        ),
      },
      {
        id: 'actor',
        header: t('admin:audit.columns.actor'),
        cell: ({ row }) => {
          const name = actorName(row.original);
          const role = row.original.actor_role ?? row.original.actor?.role;
          return name ? (
            <div>
              <div className="font-semibold">{name}</div>
              {role && <div className="text-nb-caption text-nb-gray-600">{roleLabel(role)}</div>}
            </div>
          ) : (
            <span className="text-nb-gray-600">{t('admin:audit.system')}</span>
          );
        },
      },
      {
        id: 'action',
        header: t('admin:audit.columns.action'),
        cell: ({ row }) => actionLabel(t, row.original.action),
      },
      {
        id: 'entity',
        header: t('admin:audit.columns.entity'),
        cell: ({ row }) => (
          <div>
            <div className="text-nb-caption text-nb-gray-600">
              {entityTypeLabel(t, row.original.entity_type)}
            </div>
            <div className="font-semibold">{row.original.entity_label ?? t('admin:audit.noLabel')}</div>
          </div>
        ),
      },
      {
        id: 'changes',
        header: t('admin:audit.columns.changes'),
        cell: ({ row }) => {
          const n = changedFieldCount(row.original);
          return n ? t('admin:audit.changedFields', { count: n }) : null;
        },
      },
      {
        id: 'outcome',
        header: t('admin:audit.columns.outcome'),
        cell: ({ row }) => (
          <Badge variant={OUTCOME_VARIANT[row.original.outcome] ?? 'secondary'} size="sm">
            {t(`admin:audit.outcome.${row.original.outcome}`)}
          </Badge>
        ),
      },
    ],
    [t, i18n.language],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const { truncated } = await downloadAuditCsv(filters);
      if (truncated) toast.warning(t('admin:audit.exportTruncated'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setRange({ from: '', to: '' });
    setEntityType(ALL);
    setAction(ALL);
    setOutcome(ALL);
    setActorRole(ALL);
    setSearch('');
  };

  if (!canRead) {
    return <EmptyState variant="error" title={t('admin:audit.denied')} />;
  }

  const total = logs.data?.meta.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-nb-h1">{t('admin:audit.pageTitle')}</h1>
          <p className="text-nb-body-sm text-nb-gray-600">{t('admin:audit.description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={<ShieldCheck className="size-4" />}
            onClick={() => (verifying ? chain.refetch() : setVerifying(true))}
            loading={chain.isFetching}
          >
            {chain.isFetching ? t('admin:audit.verify.checking') : t('admin:audit.verify.button')}
          </Button>
          <Button leftIcon={<Download className="size-4" />} onClick={handleExport} loading={exporting}>
            {exporting ? t('admin:audit.exporting') : t('admin:audit.export')}
          </Button>
        </div>
      </div>

      {chain.data && (
        <div
          role="status"
          className={`border-2 border-nb-black p-3 text-nb-body-sm ${
            chain.data.intact ? 'bg-nb-success-light' : 'bg-nb-danger-light font-bold'
          }`}
        >
          <p>
            {chain.data.intact
              ? t('admin:audit.verify.intact', { sealed: chain.data.sealed })
              : t('admin:audit.verify.broken', { seq: chain.data.first_broken_seq })}
          </p>
          {chain.data.unsealed > 0 && (
            <p>{t('admin:audit.verify.unsealed', { count: chain.data.unsealed })}</p>
          )}
        </div>
      )}
      {chain.isError && (
        <p role="alert" className="text-nb-body-sm font-medium text-nb-danger">
          {getErrorMessage(chain.error)}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5 xl:col-span-2">
          <span className="block text-nb-body-sm font-semibold">{t('admin:audit.filters.dateRange')}</span>
          <DateRangePicker value={range} onChange={setRange} showSteppers={false} />
        </div>
        <FormSelect
          label={t('admin:audit.filters.entityType')}
          options={typeOptions}
          value={entityType}
          onChange={setEntityType}
        />
        <FormSelect
          label={t('admin:audit.filters.action')}
          options={actionOptions}
          value={action}
          onChange={setAction}
        />
        <FormSelect
          label={t('admin:audit.filters.outcome')}
          options={outcomeOptions}
          value={outcome}
          onChange={setOutcome}
        />
        <FormSelect
          label={t('admin:audit.filters.actorRole')}
          options={roleOptions}
          value={actorRole}
          onChange={setActorRole}
        />
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-5">
          <FormInput
            label={t('admin:audit.filters.searchLabel')}
            placeholder={t('admin:audit.filters.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button variant="ghost" onClick={resetFilters} className="w-full">
            {t('admin:audit.filters.reset')}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs.data?.data ?? []}
        loading={logs.isLoading}
        error={logs.isError}
        onRetry={() => logs.refetch()}
        onRefresh={() => logs.refetch()}
        refreshing={logs.isFetching}
        getRowId={(r) => r.id}
        onRowClick={setSelected}
        enablePagination={false}
        emptyTitle={t('admin:audit.history.empty')}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-nb-body-sm">
        <span>{t('admin:audit.pager.summary', { from, to, total })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('admin:audit.pager.prev')}
          </Button>
          <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage((p) => p + 1)}>
            {t('admin:audit.pager.next')}
          </Button>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent size="wide">
          <SheetHeader>
            <SheetTitle>{t('admin:audit.detail.title')}</SheetTitle>
          </SheetHeader>
          <SheetBody>{selected && <AuditEntryDetail entry={selected} />}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
