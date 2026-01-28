'use client';

import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/forms/UserForm';
import { useUser, useUpdateUser } from '@/lib/api/users';
import { UpdateUserDto } from '@/types/models';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { NBButton } from '@/components/nb/NBButton';

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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-nb-gray-200 mb-4" />
          <div className="bg-nb-white border-3 border-nb-black shadow-nb-sm p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-nb-gray-200 mb-2" />
                  <div className="h-12 bg-nb-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <NBButton
          variant="ghost"
          size="sm"
          onClick={() => router.push('/users')}
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Kembali ke Daftar User
        </NBButton>
        <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
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
        <NBButton
          variant="ghost"
          size="sm"
          onClick={() => router.push('/users')}
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
          className="mb-4"
        >
          Kembali ke Daftar User
        </NBButton>
        <h1 className="text-3xl font-black">Edit User</h1>
        <p className="text-sm text-nb-gray-600 mt-1">
          Edit data user <span className="font-semibold">{user.name}</span>
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-nb-white border-3 border-nb-black shadow-nb-sm p-6">
        <UserForm
          initialData={user}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={updateUserMutation.isPending}
          submitText="Simpan Perubahan"
        />
      </div>

      {/* Error Display */}
      {updateUserMutation.isError && (
        <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
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

// Need to import React for use()
import * as React from 'react';
