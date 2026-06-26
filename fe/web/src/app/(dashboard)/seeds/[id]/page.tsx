/**
 * Seed Detail Page (Phase 3) — seed details & transaction ledger
 * Access: admin_data, kepala_rayon, top_management, admin_system, superadmin
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <p className="text-nb-gray-600">Memuat...</p>
      </div>
    );
  }

  if (!allowed) return null;

  const transactions = transactionsData?.items || [];
  const total = transactionsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const typeLabels: Record<string, string> = {
    purchase: 'Pembelian',
    distribution: 'Distribusi',
    adjustment: 'Penyesuaian',
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const columns: ColumnDef<SeedTransactionRow>[] = [
    {
      id: 'occurredAt',
      header: 'Tanggal',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tanggal' },
      cell: ({ row }) => (
        <span className="font-mono text-nb-body-sm">{formatDate(row.original.occurredAt)}</span>
      ),
    },
    {
      id: 'transactionType',
      header: 'Tipe',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tipe' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm">{typeLabels[row.original.transactionType] || row.original.transactionType}</span>
      ),
    },
    {
      id: 'qty',
      header: 'Jumlah',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Jumlah' },
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
      header: 'Catatan',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Catatan' },
      cell: ({ row }) => (
        <span className="text-nb-body-sm text-nb-gray-600">{row.original.notes || '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={seedLoading ? 'Memuat…' : `Bibit ${seed?.nameId || ''}`}
        description={seed?.speciesId ? `ID Spesies: ${seed.speciesId}` : undefined}
      />

      {/* Stock header card */}
      {seed && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-nb-body-sm text-nb-gray-600">Stok Saat Ini</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-nb-black">{seed.stockQty}</span>
                <span className="text-nb-body text-nb-gray-600">
                  {
                    { gram: 'gram', piece: 'buah', packet: 'paket' }[seed.unit] ||
                    seed.unit
                  }
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
            <h3 className="text-nb-h3 font-bold">Riwayat Transaksi</h3>
            {canWrite && (
              <Link href={`/seeds/${id}/transactions/new`}>
                <Button variant="default" size="sm">
                  Catat Transaksi
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
            emptyTitle="Tidak ada transaksi untuk bibit ini"
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                Halaman <b className="text-nb-black">{page}</b> / {totalPages} · {total} transaksi
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
