'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useUser } from '@/lib/auth/hooks';
import { useAssets, useBulkQr } from '@/lib/api/assets';
import { getErrorMessage } from '@/lib/api/client';
import type { ColumnDef } from '@/components/ui';
import type { Asset } from '@/lib/api/assets';

const ASSET_MANAGER_ROLES = ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'];

export default function QrBatchPage() {
  const { toast } = useToast();
  const user = useUser();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generatedQrs, setGeneratedQrs] = useState<
    { assetId: string; assetCode: string; qrCodeUrl: string }[]
  >([]);

  const { data: assetsData, isLoading: assetsLoading } = useAssets({ limit: 1000 });
  const assets = useMemo(() => assetsData?.data || [], [assetsData]);

  const bulkQrMutation = useBulkQr();

  const handleSelectAll = () => {
    if (selected.size === assets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map((a) => a.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleGenerateQr = async () => {
    if (selected.size === 0) {
      toast({
        level: "danger",
        title: 'Pilih minimal 1 aset',
      });
      return;
    }

    try {
      const result = await bulkQrMutation.mutateAsync(Array.from(selected));
      setGeneratedQrs(result);
      toast({
        level: 'success',
        title: `${result.length} QR code berhasil dibuat`,
      });
    } catch (error) {
      toast({
        level: "danger",
        title: getErrorMessage(error),
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // eslint-disable-next-line sekar-design/no-inline-hex-colors -- print stylesheet for a separate print window, not app DOM
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .item { text-align: center; page-break-inside: avoid; }
          .qr { width: 100px; height: 100px; border: 2px solid #000; }
          .code { font-family: monospace; font-weight: bold; margin-top: 10px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>QR Code Aset</h1>
        <div class="grid">
          ${generatedQrs
            .map(
              (qr) => `
            <div class="item">
              <img src="${qr.qrCodeUrl}" class="qr" />
              <div class="code">${qr.assetCode}</div>
            </div>
          `
            )
            .join('')}
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const columns: ColumnDef<Asset>[] = [
    {
      id: 'select',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Pilih' },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={() => handleToggleSelect(row.original.id)}
          aria-label={`Pilih ${row.original.asset_code}`}
        />
      ),
    },
    {
      id: 'asset_code',
      accessorKey: 'asset_code',
      header: 'Kode',
      enableSorting: false,
      meta: { label: 'Kode' },
      cell: ({ row }) => <span className="font-mono">{row.original.asset_code}</span>,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Nama',
      enableSorting: false,
      meta: { label: 'Nama' },
    },
    {
      id: 'category',
      header: 'Kategori',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Kategori' },
      cell: ({ row }) => row.original.category?.name || '—',
    },
  ];

  // Access guard — after all hooks so hook order stays stable (rules-of-hooks).
  if (user && !ASSET_MANAGER_ROLES.includes(user.role)) {
    return <div><p>Akses ditolak</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Generator QR Code" breadcrumb="Aset · QR Code" />

      <Card variant="default">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-nb-h3 font-bold">
              Pilih Aset ({selected.size} terpilih)
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={assets.length === 0}
              >
                Pilih Semua
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
              >
                <X className="w-4 h-4 mr-2" />
                Hapus Pilihan
              </Button>
            </div>
          </div>

          {assetsLoading ? (
            <Skeleton variant="card" className="h-40" />
          ) : !assets.length ? (
            <EmptyState variant="noData" title="Tidak ada aset" />
          ) : (
            <DataTable columns={columns} data={assets} enablePagination={false} getRowId={(a) => a.id} />
          )}
        </div>
      </Card>

      {!generatedQrs.length && (
        <div className="flex justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={handleGenerateQr}
            loading={bulkQrMutation.isPending}
            disabled={selected.size === 0}
          >
            Generate QR ({selected.size} terpilih)
          </Button>
        </div>
      )}

      {generatedQrs.length > 0 && (
        <Card variant="default">
          <div className="p-4 space-y-4">
            <h3 className="text-nb-h3 font-bold">Preview ({generatedQrs.length} QR)</h3>
            <div className="grid grid-cols-4 gap-6">
              {generatedQrs.map((qr) => (
                <div key={qr.assetId} className="text-center">
                  <div className="border-2 border-nb-black p-2 bg-white flex items-center justify-center">
                    <img
                      src={qr.qrCodeUrl}
                      alt={qr.assetCode}
                      className="w-24 h-24"
                    />
                  </div>
                  <p className="text-nb-caption font-mono mt-2">{qr.assetCode}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-center pt-4 border-t-2 border-nb-black">
              <Button
                variant="default"
                onClick={handlePrint}
              >
                Cetak Semua
              </Button>
              <Button variant="outline">
                Unduh PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedQrs([]);
                  setSelected(new Set());
                }}
              >
                Buat Batch Baru
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
