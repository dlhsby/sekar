'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UserForm } from '@/components/forms/UserForm';
import { useUser, useUpdateUser } from '@/lib/api/users';
import { UpdateUserDto } from '@/types/models';
import { Button, Card, CardContent } from '@/components/ui';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit User Page
 *
 * Features:
 * - Load existing user data
 * - Update user with validation
 * - Password field optional
 * - Success/error handling
 * - Loading and not found states
 * - Admin only access
 */
export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const userId = resolvedParams.id;

  // Fetch user data
  const { data: user, isLoading, error } = useUser(userId);
  const updateUserMutation = useUpdateUser();

  const handleSubmit = async (data: UpdateUserDto) => {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data,
      });
      // Success - redirect to users list
      router.push('/users');
      // Note: In a real app, you'd show a toast notification here
    } catch (error) {
      // Error handling
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6" aria-label="Memuat data pengguna...">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-nb-gray-200 border-2 border-nb-black mb-4" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-nb-gray-200 mb-2" />
                    <div className="h-12 bg-nb-gray-200" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/users')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar User
        </Button>
        <div className="bg-nb-danger-light border-2 border-nb-danger px-4 py-3" role="alert">
          <p className="text-sm text-nb-danger font-medium">
            {error ? 'Gagal memuat data user.' : 'User tidak ditemukan.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/users')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-4"
        >
          Kembali ke Daftar User
        </Button>
        <h1 className="text-3xl font-black">Edit User</h1>
        <p className="text-sm text-nb-gray-600 mt-1">
          Edit data user <span className="font-semibold">{user.name}</span>
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <UserForm
            initialData={user}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={updateUserMutation.isPending}
            submitText="Simpan Perubahan"
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {updateUserMutation.isError && (
        <div className="bg-nb-danger-light border-2 border-nb-danger px-4 py-3" role="alert" aria-live="polite">
          <p className="text-sm text-nb-danger font-medium">
            {updateUserMutation.error instanceof Error
              ? updateUserMutation.error.message
              : 'Gagal mengupdate user. Silakan coba lagi.'}
          </p>
        </div>
      )}
    </div>
  );
}
