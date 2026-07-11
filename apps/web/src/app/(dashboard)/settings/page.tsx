/**
 * Settings Page — SET-1 (Phase 4-R revamp, ADR-049).
 *
 * Two areas only:
 *   • Pribadi (Personal) — identity, appearance, language, notifications
 *     (master/detail two-column layout with a shared Save/Reset bar).
 *   • Sistem (System)    — grouped system knobs, same layout + Save/Reset bar.
 *
 * Password change lives in the profile (rotates tokens). Access: admin roles.
 */

'use client';

import { useEffect, useState } from 'react';
import { redirect, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Tabs, type TabItem } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { usePermissions } from '@/lib/auth/usePermissions';
import { PersonalSettingsTab } from '@/components/settings/PersonalSettingsTab';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';

type SettingsTab = 'personal' | 'sistem';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  // Deep-link: /settings?section=account → Personal tab, Account & Security group.
  const deepLinkAccount = searchParams.get('section') === 'account';
  const [tab, setTab] = useState<SettingsTab>('personal');
  const canViewSystem = can('settings:read');

  const tabs: TabItem<SettingsTab>[] = [
    { key: 'personal', label: t('settings:tabs.personal') },
    ...(canViewSystem ? [{ key: 'sistem' as const, label: t('settings:tabs.system') }] : []),
  ];

  useEffect(() => {
    if (!loading && (!user || !hasRole(user.role, ADMIN_ROLES))) {
      redirect('/');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-nb-gray-600">{t('settings:loading')}</p>
      </div>
    );
  }

  if (!hasRole(user.role, ADMIN_ROLES)) return null;

  return (
    <div className="space-y-5">
      <Tabs<SettingsTab>
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        aria-label={t('settings:title')}
      />

      {tab === 'personal' && (
        <PersonalSettingsTab user={user} initialGroup={deepLinkAccount ? 'accountSecurity' : undefined} />
      )}
      {tab === 'sistem' && canViewSystem && (
        <SystemSettingsTab canManage={can('settings:manage')} />
      )}
    </div>
  );
}
