/**
 * Profile (Phase 4-R — self-service)
 *
 * Any authenticated user can view their account, edit their name + phone, and
 * change their profile picture. Name/phone go through PATCH /users/me; the photo
 * through POST /users/:id/profile-picture. After each save we refreshUser() so
 * the header avatar updates instantly.
 */
'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, FormInput, SectionCard, RoleAvatar } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { useUpdateMyProfile, useUploadProfilePicture } from '@/lib/api/profile';
import { getErrorMessage } from '@/lib/api/client';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const updateProfile = useUpdateMyProfile();
  const uploadPhoto = useUploadProfilePicture(user?.id);

  // Seed the form once the user resolves (lazy, no effect-driven setState loop).
  if (user && !hydrated) {
    setFullName(user.full_name ?? '');
    setHydrated(true);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">Memuat...</div>
    );
  }

  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;
  // Only the full name is self-editable; username + phone are read-only here
  // (phone is managed by an administrator).
  const dirty = fullName.trim() !== (user.full_name ?? '');

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim() });
      await refreshUser();
      toast.success('Profil diperbarui');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Format foto harus JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Ukuran foto maksimal 5 MB.');
      return;
    }
    try {
      await uploadPhoto.mutateAsync(file);
      await refreshUser();
      toast.success('Foto profil diperbarui');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Identity + photo */}
      <SectionCard>
        <div className="flex items-center gap-4">
          <div className="relative">
            <RoleAvatar
              name={user.full_name}
              role={user.role as UserRole}
              src={user.profile_picture_url}
              size="lg"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadPhoto.isPending}
              aria-label="Ubah foto profil"
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-nb-black bg-nb-primary text-nb-black shadow-nb-xs transition-colors hover:bg-nb-primary-hover disabled:opacity-60"
            >
              {uploadPhoto.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-nb-h3 text-nb-black">{user.full_name}</h2>
            <p className="font-mono text-xs text-nb-gray-500">@{user.username}</p>
            <span className="mt-1 inline-block rounded-nb-sm border border-nb-gray-300 bg-nb-gray-100 px-2 py-0.5 text-xs font-semibold text-nb-gray-700">
              {roleLabel}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-nb-gray-500">
          Foto profil: JPG, PNG, atau WebP, maksimal 5 MB.
        </p>
      </SectionCard>

      {/* Account fields — only the name is self-editable. */}
      <SectionCard title="Informasi Akun">
        <div className="space-y-4">
          <FormInput
            label="Nama Lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap"
            maxLength={255}
          />
          <FormInput
            label="Username"
            value={user.username}
            disabled
            readOnly
          />
          <FormInput
            label="Nomor Telepon"
            type="tel"
            value={user.phone_number ?? '—'}
            disabled
            readOnly
          />
          <p className="text-xs text-nb-gray-500">
            Username dan nomor telepon dikelola oleh administrator.
          </p>

          <div className="flex justify-end border-t-2 border-nb-gray-200 pt-4">
            <Button
              variant="default"
              onClick={handleSave}
              loading={updateProfile.isPending}
              disabled={!dirty || updateProfile.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
