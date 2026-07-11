'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormInput,
  RoleAvatar,
  SectionCard,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { getErrorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/hooks';
import { useUpdateMyProfile, useUploadProfilePicture } from '@/lib/api/profile';
import { normalizePhone, INDO_MOBILE_REGEX } from '@/lib/utils/phone';
import { useThemeStore, type Theme } from '@/stores/theme';
import { useLanguage } from '@/lib/i18n/provider';
import type { SupportedLanguage } from '@/lib/i18n/resources';
import {
  getNotificationTypeLabel,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreference,
} from '@/lib/api/notification-preferences';
import { SettingsGroupRail, type SettingsGroup } from './SettingsGroupRail';
import { SettingsHeaderActions } from './SettingsHeaderActions';

type PersonalUser = { id: string; full_name: string; username: string; role: string };
type GroupKey = 'appearanceLanguage' | 'notifications' | 'accountSecurity';

/**
 * Personal settings (ADR-049) — master/detail two-column layout. Groups:
 * Tampilan & Bahasa (theme + language, staged, Save/Reset in header),
 * Notifikasi (per-type push), and Akun & Keamanan (identity, change password,
 * future MFA). Every setting is a label-left / control-right row.
 */
export function PersonalSettingsTab({
  user,
  initialGroup,
}: {
  user: PersonalUser;
  /** Pre-select a group (e.g. deep-link from the profile page). */
  initialGroup?: GroupKey;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<GroupKey>(initialGroup ?? 'appearanceLanguage');
  const [saving, setSaving] = useState(false);

  // Appearance + language — staged against the live values, saved together.
  const theme = useThemeStore((s) => s.theme);
  const initTheme = useThemeStore((s) => s.init);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [stagedTheme, setStagedTheme] = useState<Theme | undefined>(undefined);
  useEffect(() => initTheme(), [initTheme]);
  const effectiveTheme = stagedTheme ?? theme;
  const themeDirty = stagedTheme !== undefined && stagedTheme !== theme;

  const { language, setLanguage } = useLanguage();
  const [stagedLang, setStagedLang] = useState<SupportedLanguage | undefined>(undefined);
  const effectiveLang = stagedLang ?? language;
  const langDirty = stagedLang !== undefined && stagedLang !== language;

  const prefsDirty = themeDirty || langDirty;

  // Notifications — staged toggle overrides against the server list.
  const { data: notifData, isLoading: notifLoading, isError: notifError } =
    useNotificationPreferences(user.id);
  const updateNotif = useUpdateNotificationPreferences(user.id);
  const [notifOverrides, setNotifOverrides] = useState<Record<string, boolean>>({});
  const effectiveNotif: NotificationPreference[] = useMemo(
    () => (notifData ?? []).map((p) => ({ ...p, enabled: notifOverrides[p.type] ?? p.enabled })),
    [notifData, notifOverrides],
  );
  const notifDirty = useMemo(
    () =>
      (notifData ?? []).some(
        (s) => notifOverrides[s.type] !== undefined && notifOverrides[s.type] !== s.enabled,
      ),
    [notifData, notifOverrides],
  );

  const runSave = async (fn: () => Promise<void> | void) => {
    setSaving(true);
    try {
      await fn();
      toast.success(t('settings:personal.saved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = () =>
    runSave(async () => {
      if (stagedTheme) setTheme(stagedTheme);
      if (stagedLang) await setLanguage(stagedLang);
      setStagedTheme(undefined);
      setStagedLang(undefined);
    });
  const resetPrefs = () => {
    setStagedTheme(undefined);
    setStagedLang(undefined);
  };
  const saveNotif = () =>
    runSave(async () => {
      await updateNotif.mutateAsync(effectiveNotif);
      setNotifOverrides({});
    });

  const groups: SettingsGroup[] = [
    { key: 'appearanceLanguage', label: t('settings:personal.groups.appearanceLanguage'), hint: t('settings:personal.groups.appearanceLanguageHint'), dirty: prefsDirty },
    { key: 'notifications', label: t('settings:personal.groups.notifications'), hint: t('settings:personal.groups.notificationsHint'), dirty: notifDirty },
    { key: 'accountSecurity', label: t('settings:personal.groups.accountSecurity'), hint: t('settings:personal.groups.accountSecurityHint') },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <SettingsGroupRail
        groups={groups}
        selected={selected}
        onSelect={(k) => setSelected(k as GroupKey)}
        ariaLabel={t('settings:tabs.personal')}
      />

      <div>
        {selected === 'appearanceLanguage' && (
          <AppearanceLanguagePanel
            theme={effectiveTheme}
            onTheme={setStagedTheme}
            lang={effectiveLang}
            onLang={setStagedLang}
            dirty={prefsDirty}
            saving={saving}
            onReset={resetPrefs}
            onSave={savePrefs}
          />
        )}
        {selected === 'notifications' && (
          <NotificationsPanel
            loading={notifLoading || !notifData}
            error={notifError}
            prefs={effectiveNotif}
            onToggle={(type, current) =>
              setNotifOverrides((prev) => ({ ...prev, [type]: !current }))
            }
            dirty={notifDirty}
            saving={saving}
            onReset={() => setNotifOverrides({})}
            onSave={saveNotif}
          />
        )}
        {selected === 'accountSecurity' && <AccountSecurityPanel user={user} />}
      </div>
    </div>
  );
}

interface PanelActions {
  dirty: boolean;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

/**
 * Group shell — a header row with the group title + Save/Reset ABOVE the content
 * card(s), matching the System tab (buttons live outside/above any card).
 */
function PanelShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: PanelActions;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-nb-h3">{title}</h3>
        {actions && (
          <SettingsHeaderActions
            dirty={actions.dirty}
            saving={actions.saving}
            onReset={actions.onReset}
            onSave={actions.onSave}
          />
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Tampilan & Bahasa ────────────────────────────────────────────────────── */

function AppearanceLanguagePanel({
  theme,
  onTheme,
  lang,
  onLang,
  ...actions
}: {
  theme: Theme;
  onTheme: (t: Theme) => void;
  lang: SupportedLanguage;
  onLang: (l: SupportedLanguage) => void;
} & PanelActions) {
  const { t } = useTranslation();
  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: t('settings:personal.themeLight') },
    { value: 'dark', label: t('settings:personal.themeDark') },
  ];
  const langOptions: { value: SupportedLanguage; label: string }[] = [
    { value: 'id', label: t('common:language.id') },
    { value: 'en', label: t('common:language.en') },
  ];
  return (
    <PanelShell title={t('settings:personal.groups.appearanceLanguage')} actions={actions}>
      <SectionCard title={t('settings:personal.appearanceTitle')}>
        <ul className="divide-y-2 divide-nb-gray-100">
          <Row label={t('settings:personal.themeLabel')} hint={t('settings:general.darkModeHint')}>
            <Segmented options={themeOptions} value={theme} onChange={onTheme} ariaLabel={t('settings:personal.themeLabel')} />
          </Row>
        </ul>
      </SectionCard>
      <SectionCard title={t('settings:personal.languageTitle')}>
        <ul className="divide-y-2 divide-nb-gray-100">
          <Row label={t('settings:personal.languageLabel')} hint={t('settings:general.languageHint')}>
            <Select options={langOptions} value={lang} onChange={onLang} ariaLabel={t('settings:personal.languageLabel')} />
          </Row>
        </ul>
      </SectionCard>
    </PanelShell>
  );
}

/* ── Notifikasi ───────────────────────────────────────────────────────────── */

function NotificationsPanel({
  loading,
  error,
  prefs,
  onToggle,
  ...actions
}: {
  loading: boolean;
  error: boolean;
  prefs: NotificationPreference[];
  onToggle: (type: string, current: boolean) => void;
} & PanelActions) {
  const { t } = useTranslation();
  return (
    <PanelShell
      title={t('settings:personal.groups.notifications')}
      actions={loading || error ? undefined : actions}
    >
      <SectionCard
        title={t('settings:notifications.preferences')}
        meta={t('settings:notifications.perTypePush')}
      >
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </div>
        ) : error ? (
          <p className="py-4 text-nb-body-sm text-nb-danger">{t('settings:notifications.loadError')}</p>
        ) : (
          <ul className="divide-y-2 divide-nb-gray-100">
            {prefs.map((pref) => {
              const label = getNotificationTypeLabel(pref.type, t) ?? pref.type;
              return (
                <Row key={pref.type} label={label}>
                  <Toggle checked={pref.enabled} label={label} onToggle={() => onToggle(pref.type, pref.enabled)} />
                </Row>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PanelShell>
  );
}

/* ── Akun & Keamanan ──────────────────────────────────────────────────────── */

function AccountSecurityPanel({ user }: { user: PersonalUser }) {
  const { t } = useTranslation();
  const { user: authUser, refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const uploadPicture = useUploadProfilePicture(user.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const roleLabel = t(`roles:${user.role}`, { defaultValue: user.role.replace(/_/g, ' ') });

  const schema = useMemo(
    () =>
      z.object({
        full_name: z.string().min(2, t('validation:nameMin', { count: 2 })),
        username: z
          .string()
          .min(2, t('validation:usernameMin', { count: 2 }))
          .regex(/^[a-zA-Z0-9_-]+$/, t('admin:users.form.usernameInvalid')),
        phone_number: z.string().regex(INDO_MOBILE_REGEX, t('validation:invalidPhone')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<{ full_name: string; username: string; phone_number: string }>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      phone_number: authUser?.phone_number ?? '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateProfile.mutateAsync({
        full_name: data.full_name.trim(),
        username: data.username,
        phone_number: normalizePhone(data.phone_number),
      });
      await refreshUser();
      toast.success(t('settings:personal.profileSaved'));
      reset(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPicture.mutateAsync(file);
      await refreshUser();
      toast.success(t('settings:personal.photoSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <PanelShell
      title={t('settings:personal.groups.accountSecurity')}
      actions={{ dirty: isDirty, saving: isSubmitting, onReset: () => reset(), onSave: () => void onSubmit() }}
    >
      {/* Profile (photo + editable fields) */}
      <SectionCard title={t('settings:personal.profileTitle')}>
        <div className="mb-4 flex items-center gap-4">
          <RoleAvatar
            name={user.full_name}
            role={user.role as never}
            src={authUser?.profile_picture_url}
            size="lg"
          />
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Camera className="size-4" />}
              loading={uploadPicture.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {t('settings:personal.changePhoto')}
            </Button>
            <p className="mt-1 text-nb-caption text-nb-gray-600">{roleLabel}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormInput
            label={t('settings:general.fullName')}
            error={errors.full_name?.message}
            disabled={isSubmitting}
            {...register('full_name')}
          />
          <FormInput
            label={t('settings:general.username')}
            error={errors.username?.message}
            disabled={isSubmitting}
            {...register('username')}
          />
          <FormInput
            label={t('admin:users.form.phoneNumber')}
            error={errors.phone_number?.message}
            disabled={isSubmitting}
            {...register('phone_number')}
          />
        </form>
      </SectionCard>

      {/* Security (password + MFA) — actions here are self-contained (modal). */}
      <SectionCard title={t('settings:personal.securityTitle')}>
        <ul className="divide-y-2 divide-nb-gray-100">
          <Row label={t('settings:personal.passwordLabel')} hint={t('settings:personal.changePasswordHint')}>
            <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
              {t('settings:personal.changePasswordButton')}
            </Button>
          </Row>
          <Row label={t('settings:personal.mfaTitle')} hint={t('settings:personal.mfaHint')}>
            <span className="inline-flex items-center gap-1.5 rounded-nb-sm border-2 border-nb-black bg-nb-gray-100 px-2 py-1 text-nb-caption font-bold text-nb-gray-600">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t('settings:personal.comingSoon')}
            </span>
          </Row>
        </ul>
      </SectionCard>

      <ChangePasswordModal open={pwOpen} onOpenChange={setPwOpen} />
    </PanelShell>
  );
}

function ChangePasswordModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const formId = 'change-password-form';
  const schema = useMemo(
    () =>
      z
        .object({
          old_password: z.string().min(1, t('auth:changePassword.validationCurrentRequired')),
          new_password: z.string().min(8, t('auth:changePassword.validationNewPasswordMin')),
          confirm_password: z.string().min(1, t('auth:changePassword.validationConfirmRequired')),
        })
        .refine((d) => d.new_password === d.confirm_password, {
          message: t('auth:changePassword.validationConfirmMatch'),
          path: ['confirm_password'],
        }),
    [t],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ old_password: string; new_password: string; confirm_password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await changePassword({ old_password: data.old_password, new_password: data.new_password });
      toast.success(t('auth:changePassword.successTitle'));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  // Reset the fields whenever the modal is (re)opened/closed.
  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('settings:personal.changePasswordTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id={formId} onSubmit={onSubmit} className="space-y-4">
            <FormInput
              label={t('auth:changePassword.currentPassword')}
              type="password"
              placeholder={t('auth:changePassword.currentPasswordPlaceholder')}
              error={errors.old_password?.message}
              disabled={isSubmitting}
              {...register('old_password')}
            />
            <FormInput
              label={t('auth:changePassword.newPassword')}
              type="password"
              placeholder={t('auth:changePassword.newPasswordPlaceholder')}
              error={errors.new_password?.message}
              disabled={isSubmitting}
              {...register('new_password')}
            />
            <FormInput
              label={t('auth:changePassword.confirmPassword')}
              type="password"
              placeholder={t('auth:changePassword.confirmPasswordPlaceholder')}
              error={errors.confirm_password?.message}
              disabled={isSubmitting}
              {...register('confirm_password')}
            />
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} size="sm" loading={isSubmitting}>
            {t('auth:changePassword.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── shared controls ──────────────────────────────────────────────────────── */

/** A label-left / control-right settings row. */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-nb-black">{label}</p>
        {hint && <p className="text-nb-caption text-nb-gray-600">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-nb-base border-2 border-nb-black bg-nb-white p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-touch rounded-nb-sm px-4 text-nb-body-sm font-semibold transition-colors',
              active ? 'bg-nb-primary text-nb-black' : 'bg-transparent text-nb-gray-600 hover:bg-nb-gray-100',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Select<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-11 w-40 rounded-nb-base border-2 border-nb-black bg-nb-white px-3 text-nb-body-sm font-semibold text-nb-black shadow-nb-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors',
        checked ? 'bg-nb-primary' : 'bg-nb-gray-200',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full border-2 border-nb-black bg-nb-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

