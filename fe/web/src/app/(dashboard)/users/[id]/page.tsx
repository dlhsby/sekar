'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { UserForm, type UserFormSubmit } from '@/components/forms/UserForm';
import { useUser, useUpdateUser, useResetUserPassword } from '@/lib/api/users';
import { Button, Card, CardContent } from '@/components/ui';
import { TempPasswordDialog } from '@/components/users/TempPasswordDialog';

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
  const resetPasswordMutation = useResetUserPassword();
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);

  const handleSubmit = async (data: UserFormSubmit) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, data });
      router.push('/users');
    } catch (error) {
      throw error;
    }
  };

  const handleResetPassword = async () => {
    const result = await resetPasswordMutation.mutateAsync(userId);
    setTempPassword(result.temp_password);
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
          Edit data user <span className="font-semibold">{user.full_name}</span>
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
        <div
          className="bg-nb-danger-light border-2 border-nb-danger px-4 py-3"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-nb-danger font-medium">
            {updateUserMutation.error instanceof Error
              ? updateUserMutation.error.message
              : 'Gagal mengupdate user. Silakan coba lagi.'}
          </p>
        </div>
      )}

      {/* Reset password */}
      <Card variant="outlined">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <h2 className="font-bold">Reset Password</h2>
            <p className="text-sm text-nb-gray-600">
              Buat password sementara baru. Pengguna wajib menggantinya saat login berikutnya.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<KeyRound className="size-4" />}
            loading={resetPasswordMutation.isPending}
            onClick={handleResetPassword}
          >
            Reset Password
          </Button>
        </CardContent>
      </Card>

      <TempPasswordDialog
        password={tempPassword}
        username={user.username}
        onClose={() => setTempPassword(null)}
      />
    </div>
  );
}
