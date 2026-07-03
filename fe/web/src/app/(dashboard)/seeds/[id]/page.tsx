/**
 * Seed Detail Page (Phase 3) — seed details & transaction ledger
 * Access: admin_data, kepala_rayon, top_management, admin_system, superadmin
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/hooks';
import { useSeedDetail, useSeedTransactions } from '@/lib/api/seeds';
import {
  Card,
  CardContent,
  Button,
  DataTable,
  PageHeader,
  Badge,
} from '@/components/ui';
import { SeedTransactionRow } from '@/lib/api/seeds';
import type { ColumnDef } from '@/components/ui/data-table';

const ALLOWED_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const READ_ONLY_ROLES = ['kepala_rayon', 'admin_system'];

interface SeedDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SeedDetailPage({ params }: SeedDetailPageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(['seeds', 'common']);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: seed, isLoading: seedLoading } = useSeedDetail(id);
  const { data: transactionsData, isLoading: transactionsLoading } = useSeedTransactions(id, {
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);
  const canWrite = !!user && !READ_ONLY_ROLES.includes(user.role);

  useEffect(() => {
    if (!authLoading && user && !allowed) {
      router.push('/');
    }
  }, [user, authLoading, allowed, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!allowed) return null;

  const transactions = transactionsData?.items || [];
  const total = transactionsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const columns: ColumnDef<SeedTransactionRow>[] = [
    {
      id: 'occurredAt',
      header: t('seeds:detailTransactionTable.columnDate'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('seeds:detailTransactionTable.columnDate') },
      cell: ({ row }) => (
        <span className="font-mono text-nb-body-sm">{formatDate(row.original.occurredAt)}</span>
      ),
    },
    {
      id: 'transactionType',
      header: t('seeds:detailTransactionTable.columnType'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('seeds:detailTransactionTable.columnType') },
      cell: ({ row }) => (
        <span className="text-nb-body-sm">{t(`seeds:transactionTypes.${row.original.transactionType}`) || row.original.transactionType}</span>
      ),
    },
    {
      id: 'qty',
      header: t('seeds:detailTransactionTable.columnQuantity'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('seeds:detailTransactionTable.columnQuantity') },
      cell: ({ row }) => {
        // distribution: negative (decrements), others: positive
        const display = row.original.transactionType === 'distribution' ? -row.original.qty : row.original.qty;
        return (
          <span className="font-mono text-nb-body-sm">
            {display > 0 ? '+' : ''}{display}
          </span>
        );
      },
    },
    {
      id: 'notes',
      header: t('seeds:detailTransactionTable.columnNotes'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('seeds:detailTransactionTable.columnNotes') },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">{row.original.notes || '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={seedLoading ? t('seeds:detail.loadingTitle') : `${t('common:entities.seed')} ${seed?.nameId || ''}`}
        description={seed?.speciesId ? `${t('seeds:detail.speciesIdPrefix')}: ${seed.speciesId}` : undefined}
      />

      {/* Stock header card */}
      {seed && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-nb-body-sm text-nb-gray-600">{t('seeds:detailStock.label')}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-nb-black">{seed.stockQty}</span>
                <span className="text-nb-body text-nb-gray-600">
                  {t(`seeds:units.${seed.unit}`) || seed.unit}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions ledger */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-nb-h3 font-bold">{t('seeds:detailTransactions.title')}</h3>
            {canWrite && (
              <Link href={`/seeds/${id}/transactions/new`}>
                <Button variant="default" size="sm">
                  {t('seeds:detailTransactions.addButton')}
                </Button>
              </Link>
            )}
          </div>

          <DataTable
            columns={columns}
            data={transactions}
            loading={transactionsLoading}
            enablePagination={false}
            getRowId={(t) => t.id}
            emptyTitle={t('seeds:detailTransactions.emptyTitle')}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                {t('seeds:detailPagination.pageLabel')} <b className="text-nb-black">{page}</b> / {totalPages} · {total} {t('seeds:detailPagination.itemsLabel')}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
