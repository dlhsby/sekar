/**
 * Seeds List Page (Phase 3) — seed inventory master list
 * Access: admin_data, kepala_rayon, top_management, admin_system, superadmin
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useSeeds } from '@/lib/api/seeds';
import {
  Card,
  CardContent,
  Button,
  FormInput,
  DataTable,
  PageHeader,
  Badge,
} from '@/components/ui';
import { PlantSeedRow } from '@/lib/api/seeds';
import type { ColumnDef } from '@/components/ui/data-table';

const ALLOWED_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const LOW_STOCK_THRESHOLD = 10;

export default function SeedsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: seedsData, isLoading: seedsLoading } = useSeeds({
    search,
    page,
    limit,
  });

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

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

  const seeds = seedsData?.items || [];
  const total = seedsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const columns: ColumnDef<PlantSeedRow>[] = [
    {
      key: 'nameId',
      header: 'Nama Bibit',
      cell: (seed: any) => (
        <Link href={`/seeds/${seed.id}`} className="font-semibold text-nb-primary hover:underline">
          {seed.nameId}
        </Link>
      ),
    },
    {
      key: 'unit',
      header: 'Satuan',
      cell: (seed: any) => {
        const unitLabels: Record<string, string> = {
          gram: 'gram',
          piece: 'buah',
          packet: 'paket',
        };
        return <span className="text-nb-body-sm">{unitLabels[seed.unit] || seed.unit}</span>;
      },
    },
    {
      key: 'stockQty',
      header: 'Stok',
      cell: (seed: any) => {
        const isLowStock = seed.stockQty < LOW_STOCK_THRESHOLD;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-nb-body-sm">{seed.stockQty}</span>
            {isLowStock && (
              <Badge variant="warning" size="sm">
                Rendah
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Bibit"
        description="Kelola inventaris bibit dan transaksi"
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <FormInput
              label="Cari bibit"
              type="text"
              placeholder="Cari bibit berdasarkan nama…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>

          <DataTable<any>
            columns={columns}
            data={seeds}
            loading={seedsLoading}
            emptyMessage="Tidak ada bibit tersedia"
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-nb-gray-600">
              <span>
                Halaman <b className="text-nb-black">{page}</b> / {totalPages} · {total} bibit
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
