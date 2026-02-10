'use client';

/**
 * Edit Area Page
 * Edit an existing area with polygon editor
 */

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { AreaForm } from '@/components/forms/AreaForm';
import { useArea, useUpdateArea } from '@/lib/api/areas';
import { useAuth } from '@/lib/auth/hooks';
import type { UpdateAreaDto } from '@/types/models';

export default function EditAreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: area, isLoading: loadingArea } = useArea(id);
  const updateArea = useUpdateArea();
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  if (user && user.role !== 'admin' && user.role !== 'top_management') {
    router.push(`/areas/${id}`);
    return null;
  }

  const handleSubmit = async (data: UpdateAreaDto) => {
    setError(null);

    try {
      await updateArea.mutateAsync({ id, data });
      router.push(`/areas/${id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Gagal memperbarui area');
      } else {
        setError('Gagal memperbarui area');
      }
    }
  };

  const handleCancel = () => {
    router.push(`/areas/${id}`);
  };

  // Loading state
  if (loadingArea) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
        <div className="h-96 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
      </div>
    );
  }

  // Not found state
  if (!area) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-nb-danger">
          <CardContent className="p-8 text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-bold text-lg mb-2">Area Tidak Ditemukan</h3>
            <p className="text-sm text-nb-gray-600 mb-4">
              Area yang Anda cari tidak ditemukan.
            </p>
            <Button onClick={() => router.push('/areas')}>
              Kembali ke Daftar Area
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Edit Area</h1>
          <p className="text-nb-gray-600 mt-1">
            Perbarui informasi area: <strong>{area.name}</strong>
          </p>
        </div>

        <Button onClick={handleCancel} variant="secondary" leftIcon={<X className="w-5 h-5" />}>
          Batal
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="p-4 bg-nb-danger-light border-2 border-nb-danger rounded-nb-md"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h4 className="font-bold mb-1">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <AreaForm
            mode="edit"
            initialData={area}
            onSubmit={handleSubmit}
            isLoading={updateArea.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
