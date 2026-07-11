/**
 * Settings Page — SET-1 (Phase 4-R revamp).
 *
 * Tabbed shell scoped to backed surfaces only (no fabricated panels):
 *   • Umum      — read-only identity + appearance (dark mode) + link to /profile
 *   • Keamanan  — change password (POST /auth/change-password, rotates tokens)
 *   • Notifikasi — per-type push toggles (GET/PATCH /users/:id/notification-preferences)
 *
 * Access: admin roles (reached via the avatar dropdown). The fake language
 * toggle and stale "Phase 2" version strings from the old page are dropped.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Moon, Sun, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Button,
  LanguageSwitcher,
  SectionCard,
  StatusPill,
  Tabs,
  type TabItem,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { usePermissions } from '@/lib/auth/usePermissions';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import { getErrorMessage } from '@/lib/api/client';
import { useThemeStore } from '@/stores/theme';
import {
  getNotificationTypeLabel,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreference,
} from '@/lib/api/notification-preferences';

type SettingsTab = 'personal' | 'sistem';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const [tab, setTab] = useState<SettingsTab>('personal');
  const canViewSystem = can('settings:read');

  // Two areas only (ADR-049): Personal (identity, appearance, language,
  // notifications) and System settings. Password change lives in the profile.
  const tabs: TabItem<SettingsTab>[] = [
    { key: 'personal', label: t('settings:tabs.personal') },
    ...(canViewSystem
      ? [{ key: 'sistem' as const, label: t('settings:tabs.system') }]
      : []),
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
        <div className="space-y-5">
          <GeneralTab user={user} />
          <NotificationsTab userId={user.id} />
        </div>
      )}
      {tab === 'sistem' && canViewSystem && (
        <SystemSettingsTab canManage={can('settings:manage')} />
      )}
    </div>
  );
}

/* ── Umum ─────────────────────────────────────────────────────────────────── */

function GeneralTab({ user }: { user: { full_name: string; username: string; role: string } }) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const init = useThemeStore((s) => s.init);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    init();
  }, [init]);

  const isDark = theme === 'dark';
  const roleLabel = t(`roles:${user.role}`, { defaultValue: user.role.replace(/_/g, ' ') });

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('settings:general.identity')}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/profile">
              {t('settings:general.editProfile')} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        }
      >
        <dl className="space-y-2.5 text-nb-body-sm">
          <Row label={t('settings:general.fullName')} value={user.full_name} />
          <Row label={t('settings:general.username')} value={user.username} mono />
          <Row
            label={t('settings:general.role')}
            value={<StatusPill tone="dark">{roleLabel}</StatusPill>}
          />
        </dl>
        <p className="mt-3 text-nb-caption text-nb-gray-600">
          {t('settings:general.identityHint')}
        </p>
      </SectionCard>

      <SectionCard title={t('settings:general.appearance')}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-nb-black">{t('settings:general.darkMode')}</p>
            <p className="text-nb-caption text-nb-gray-600">
              {t('settings:general.darkModeHint')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={t('settings:general.darkMode')}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors ${
              isDark ? 'bg-nb-primary' : 'bg-nb-gray-200'
            }`}
          >
            <span
              className={`inline-flex size-5 items-center justify-center rounded-full border-2 border-nb-black bg-nb-white transition-transform ${
                isDark ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            >
              {isDark ? <Moon className="size-3" /> : <Sun className="size-3" />}
            </span>
          </button>
        </div>
      </SectionCard>

      <SectionCard title={t('settings:general.language')}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-nb-black">{t('common:language.label')}</p>
            <p className="text-nb-caption text-nb-gray-600">
              {t('settings:general.languageHint')}
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Notifikasi ───────────────────────────────────────────────────────────── */

function NotificationsTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useNotificationPreferences(userId);
  const updateMutation = useUpdateNotificationPreferences(userId);
  // Local toggle overrides keyed by type — derived against the server list at
  // render time, so there's no setState-in-effect to sync props into state.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const effective: NotificationPreference[] = useMemo(
    () => (data ?? []).map((p) => ({ ...p, enabled: overrides[p.type] ?? p.enabled })),
    [data, overrides],
  );

  const dirty = useMemo(
    () => (data ?? []).some((s) => overrides[s.type] !== undefined && overrides[s.type] !== s.enabled),
    [data, overrides],
  );

  const toggle = (type: string, current: boolean) => {
    setOverrides((prev) => ({ ...prev, [type]: !current }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(effective);
      setOverrides({});
      toast.success(t('settings:notifications.saved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading || !data) {
    return (
      <SectionCard title={t('settings:notifications.title')}>
        <p className="py-4 text-nb-body-sm text-nb-gray-600">
          {t('settings:notifications.loadingPreferences')}
        </p>
      </SectionCard>
    );
  }

  if (isError) {
    return (
      <SectionCard title={t('settings:notifications.title')}>
        <p className="py-4 text-nb-body-sm text-nb-danger">
          {t('settings:notifications.loadError')}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t('settings:notifications.preferences')}
      meta={t('settings:notifications.perTypePush')}
      className="max-w-xl"
      action={
        <Button size="sm" onClick={handleSave} loading={updateMutation.isPending} disabled={!dirty}>
          {t('common:actions.save')}
        </Button>
      }
    >
      <ul className="divide-y-2 divide-nb-gray-100">
        {effective.map((pref) => (
          <li key={pref.type} className="flex items-center justify-between gap-4 py-3">
            <span className="text-nb-body-sm text-nb-black">
              {getNotificationTypeLabel(pref.type, t) ?? pref.type}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={pref.enabled}
              aria-label={getNotificationTypeLabel(pref.type, t) ?? pref.type}
              onClick={() => toggle(pref.type, pref.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors ${
                pref.enabled ? 'bg-nb-primary' : 'bg-nb-gray-200'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full border-2 border-nb-black bg-nb-white transition-transform ${
                  pref.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ── shared ───────────────────────────────────────────────────────────────── */

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
      <dt className="text-nb-gray-600">{label}</dt>
      <dd className={mono ? 'font-mono text-[13px] text-nb-black' : 'text-nb-black'}>{value}</dd>
    </div>
  );
}
