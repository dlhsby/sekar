'use client';

/**
 * New Area Page
 * Create a new area with polygon editor
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { AreaForm } from '@/components/forms/AreaForm';
import { useCreateArea } from '@/lib/api/areas';
import { useAuth } from '@/lib/auth/hooks';
import type { CreateAreaDto, UpdateAreaDto } from '@/types/models';

export default function NewAreaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createArea = useCreateArea();
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  if (user && user.role !== 'admin' && user.role !== 'top_management') {
    router.push('/areas');
    return null;
  }

  const handleSubmit = async (data: CreateAreaDto | UpdateAreaDto) => {
    setError(null);

    try {
      await createArea.mutateAsync(data as CreateAreaDto);
      router.push('/areas');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Gagal menyimpan area');
      } else {
        setError('Gagal menyimpan area');
      }
    }
  };

  const handleCancel = () => {
    router.push('/areas');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Tambah Area Baru</h1>
          <p className="text-nb-gray-600 mt-1">
            Gambar batas area di peta dan lengkapi informasi
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
            mode="create"
            onSubmit={handleSubmit}
            isLoading={createArea.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
