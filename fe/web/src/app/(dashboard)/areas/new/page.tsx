'use client';

/**
 * New Area Page
 * Create a new area with polygon editor
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NBButton } from '@/components/nb';
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
          <p className="text-gray-600 mt-1">
            Gambar batas area di peta dan lengkapi informasi
          </p>
        </div>

        <NBButton onClick={handleCancel} variant="secondary">
          ✖️ Batal
        </NBButton>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-4 border-black p-4 rounded-lg">
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
      <div className="bg-white border-4 border-black p-6 rounded-lg">
        <AreaForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={createArea.isPending}
        />
      </div>
    </div>
  );
}
