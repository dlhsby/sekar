'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UserForm } from '@/components/forms/UserForm';
import { useCreateUser } from '@/lib/api/users';
import { CreateUserDto } from '@/types/models';
import { Button, Card, CardContent } from '@/components/ui';

/**
 * New User Page
 *
 * Features:
 * - Create new user with validation
 * - Success/error handling
 * - Redirect to list after creation
 * - Admin only access
 */
export default function NewUserPage() {
  const router = useRouter();
  const createUserMutation = useCreateUser();

  const handleSubmit = async (data: CreateUserDto) => {
    try {
      await createUserMutation.mutateAsync(data);
      // Success - redirect to users list
      router.push('/users');
      // Note: In a real app, you'd show a toast notification here
    } catch (error) {
      // Error handling
      console.error('Failed to create user:', error);
      // The error will be displayed by the form or a global error handler
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

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
        <h1 className="text-3xl font-black">Tambah User Baru</h1>
        <p className="text-sm text-nb-gray-600 mt-1">
          Lengkapi form di bawah untuk membuat user baru
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <UserForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={createUserMutation.isPending}
            submitText="Buat User"
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {createUserMutation.isError && (
        <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
          <p className="text-sm text-nb-danger font-medium">
            {createUserMutation.error instanceof Error
              ? createUserMutation.error.message
              : 'Gagal membuat user. Silakan coba lagi.'}
          </p>
        </div>
      )}
    </div>
  );
}
