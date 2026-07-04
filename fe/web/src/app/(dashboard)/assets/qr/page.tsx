'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('assets:qr.selectMinimum'),
      });
      return;
    }

    try {
      const result = await bulkQrMutation.mutateAsync(Array.from(selected));
      setGeneratedQrs(result);
      toast({
        level: 'success',
        title: t('assets:qr.generateSuccess', { count: result.length }),
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
        <h1>${t('assets:qr.printTitle')}</h1>
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
      meta: { label: t('assets:maintenance2.selectLabel') },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={() => handleToggleSelect(row.original.id)}
          aria-label={t('assets:qr.selectCheckbox', { code: row.original.asset_code })}
        />
      ),
    },
    {
      id: 'asset_code',
      accessorKey: 'asset_code',
      header: t('assets:qr.tableColumns.code'),
      enableSorting: false,
      meta: { label: t('assets:qr.tableColumns.code') },
      cell: ({ row }) => <span className="font-mono">{row.original.asset_code}</span>,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: t('assets:qr.tableColumns.name'),
      enableSorting: false,
      meta: { label: t('assets:qr.tableColumns.name') },
    },
    {
      id: 'category',
      header: t('assets:qr.tableColumns.category'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('assets:qr.tableColumns.category') },
      cell: ({ row }) => row.original.category?.name || '—',
    },
  ];

  // Access guard — after all hooks so hook order stays stable (rules-of-hooks).
  if (user && !ASSET_MANAGER_ROLES.includes(user.role)) {
    return <div><p>{t('common:errors.noPermission.short')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('assets:qr.pageTitle')} breadcrumb={t('assets:qr.breadcrumb')} />

      <Card variant="default">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-nb-h3 font-bold">
              {t('assets:qr.selectAssets')} ({selected.size} {t('assets:qr.selected')})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={assets.length === 0}
              >
                {t('assets:qr.selectAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
              >
                <X className="w-4 h-4 mr-2" />
                {t('assets:qr.clearSelection')}
              </Button>
            </div>
          </div>

          {assetsLoading ? (
            <Skeleton variant="card" className="h-40" />
          ) : !assets.length ? (
            <EmptyState variant="noData" title={t('assets:qr.noAssets')} />
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
            {t('assets:qr.generateQr')} ({selected.size} {t('assets:qr.selected')})
          </Button>
        </div>
      )}

      {generatedQrs.length > 0 && (
        <Card variant="default">
          <div className="p-4 space-y-4">
            <h3 className="text-nb-h3 font-bold">{t('assets:qr.preview')} ({generatedQrs.length} QR)</h3>
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
                {t('assets:qr.printAll')}
              </Button>
              <Button variant="outline">
                {t('assets:qr.downloadPdf')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedQrs([]);
                  setSelected(new Set());
                }}
              >
                {t('assets:qr.newBatch')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
