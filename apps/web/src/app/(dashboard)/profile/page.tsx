/**
 * Profile (Phase 4-R — self-service, read-only view)
 *
 * Displays the authenticated user's account. Editing (name, username, phone,
 * photo) + password change moved to Settings → Akun & Keamanan (ADR-049), so
 * this page is a read-only summary with a link there.
 */
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Button, FormInput, SectionCard, RoleAvatar } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

export default function ProfilePage() {
  const { t } = useTranslation(['profile']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">
        {t('page.loading')}
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Identity + photo */}
      <SectionCard
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/settings">
              {t('page.editInSettings')} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <RoleAvatar
            name={user.full_name}
            role={user.role as UserRole}
            src={user.profile_picture_url}
            size="lg"
          />
          <div className="min-w-0">
            <h2 className="truncate text-nb-h3 text-nb-black">{user.full_name}</h2>
            <p className="font-mono text-xs text-nb-gray-500">@{user.username}</p>
            <span className="mt-1 inline-block rounded-nb-sm border border-nb-gray-300 bg-nb-gray-100 px-2 py-0.5 text-xs font-semibold text-nb-gray-700">
              {roleLabel}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Account fields — read-only; edit in Settings → Account & Security. */}
      <SectionCard title={t('page.accountSection')}>
        <div className="space-y-4">
          <FormInput label={t('page.fullNameLabel')} value={user.full_name} disabled readOnly />
          <FormInput label={t('page.usernameLabel')} value={user.username} disabled readOnly />
          <FormInput
            label={t('page.phoneLabel')}
            type="tel"
            value={user.phone_number ?? '—'}
            disabled
            readOnly
          />
          <p className="text-xs text-nb-gray-500">{t('page.editInSettingsHint')}</p>
        </div>
      </SectionCard>
    </div>
  );
}
