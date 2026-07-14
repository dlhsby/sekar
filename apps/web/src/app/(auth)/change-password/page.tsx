'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FormInput, Button, useToast } from '@/components/ui';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { useAuth } from '@/lib/auth/hooks';
import { getErrorMessage } from '@/lib/api/client';

/**
 * Forced password-change screen (ADR-041, Phase 4-7) — web parity with the
 * mobile ChangePasswordModal. Shown when `user.password_must_change` is true
 * after an admin reset; the AuthContext gate redirects every other route here
 * until a new password is set. `old_password` is intentionally omitted (the
 * JWT + the flag already authorise the change).
 */
type FormData = {
  new_password: string;
  confirm_password: string;
};

export default function ChangePasswordPage() {
  const { user, loading, changePassword, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          new_password: z.string().min(6, t('auth:changePassword.validationNewPasswordMin')),
          confirm_password: z.string().min(1, t('auth:changePassword.validationConfirmRequired')),
        })
        .refine((data) => data.new_password === data.confirm_password, {
          message: t('auth:changePassword.validationConfirmMatch'),
          path: ['confirm_password'],
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await changePassword({ new_password: data.new_password });
      toast({
        level: 'success',
        title: t('auth:changePassword.successTitle'),
        body: t('auth:changePassword.successBody'),
      });
    } catch (err) {
      toast({
        level: 'danger',
        title: t('auth:changePassword.errorTitle'),
        body: getErrorMessage(err),
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nb-background">
        <div className="text-nb-gray-600">{t('auth:loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nb-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLockup size={44} subtitle={null} />
        </div>

        <div className="rounded-nb-md border-2 border-nb-black bg-nb-white p-6 shadow-nb-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-primary-soft">
            <ShieldCheck className="size-6 text-nb-black" aria-hidden="true" />
          </div>

          <h1 className="text-nb-h2 text-nb-black">{t('auth:changePassword.heading')}</h1>
          <p className="mt-2 text-nb-body-sm text-nb-gray-700">
            {t('auth:changePassword.description')}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div className="relative">
              <FormInput
                label={t('auth:changePassword.newPassword')}
                type={showNew ? 'text' : 'password'}
                placeholder={t('auth:changePassword.newPasswordPlaceholder')}
                error={errors.new_password?.message}
                disabled={isSubmitting}
                {...register('new_password')}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-[34px] rounded-nb-sm p-1 text-nb-gray-500 transition-colors hover:text-nb-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:-outline-offset-2"
                aria-label={showNew ? t('auth:changePassword.hidePassword') : t('auth:changePassword.showPassword')}
              >
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <FormInput
                label={t('auth:changePassword.confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('auth:changePassword.confirmPasswordPlaceholder')}
                error={errors.confirm_password?.message}
                disabled={isSubmitting}
                {...register('confirm_password')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-[34px] rounded-nb-sm p-1 text-nb-gray-500 transition-colors hover:text-nb-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:-outline-offset-2"
                aria-label={showConfirm ? t('auth:changePassword.hidePassword') : t('auth:changePassword.showPassword')}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="default"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common:actions.saving') : t('auth:changePassword.submit')}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => logout()}
              className="font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 hover:text-nb-black"
            >
              {t('auth:logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
