'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { FormInput, Button } from '@/components/ui';
import { SekarLogoBox } from '@/components/brand/SekarLogoBox';
import { useAuth } from '@/lib/auth/hooks';
import { getErrorMessage } from '@/lib/api/client';

/**
 * Login form schema with validation
 */
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username / No. HP wajib diisi')
    .max(50, 'Username / No. HP maksimal 50 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Brand lockup reused in the brand panel (desktop) + the mobile form header. */
function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <SekarLogoBox size={48} />
      <div className="leading-tight">
        <p className="font-heading text-2xl font-extrabold text-nb-black">SEKAR</p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-nb-gray-700">
          DLH Surabaya
        </p>
      </div>
    </div>
  );
}

/**
 * Login Form Component (wrapped in Suspense to fix CSR bailout)
 * LOG-1 — two-column "Konsol SEKAR": brand panel (left) + form (right).
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect);
    }
  }, [user, authLoading, router, redirect]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
    } catch (err) {
      let errorMessage = getErrorMessage(err);
      if (errorMessage === 'Invalid credentials') {
        errorMessage = 'Username / No. HP atau Password salah';
      }
      setError(errorMessage);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nb-background">
        <div className="text-nb-gray-600">Memeriksa autentikasi...</div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-nb-black bg-nb-primary p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <div className="mb-8">
            <BrandLockup />
          </div>
          <h2 className="text-nb-display text-nb-black">
            Konsol
            <br />
            pengelolaan
            <br />
            RTH Surabaya.
          </h2>
          <p className="mt-4 max-w-[36ch] text-nb-body-sm text-nb-black">
            Pantau satgas, kelola tugas, dan proses permohonan perantingan dari satu konsol terpusat.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-nb-black bg-nb-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-black">
            <span className="size-1.5 rounded-full bg-status-active" /> Live monitoring
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-nb-black bg-nb-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-nb-black">
            <span className="size-1.5 rounded-full bg-nb-info" /> Offline-safe
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center bg-nb-background px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-[340px]">
          {/* Mobile brand header (brand panel is desktop-only) */}
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-600">
            <span className="size-2 rounded-full border-[1.5px] border-nb-black bg-nb-primary" />
            Masuk ke konsol
          </div>
          <h1 className="text-nb-h1 text-nb-black">Selamat datang kembali</h1>
          <p className="mb-6 mt-2 text-nb-body-sm text-nb-gray-700">
            Gunakan akun yang dibuat oleh Admin — username atau nomor HP yang terdaftar.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div
                className="rounded-nb-md border-2 border-nb-danger bg-nb-danger-light p-3"
                role="alert"
                aria-live="polite"
              >
                <p className="text-nb-body-sm font-medium text-nb-black">{error}</p>
              </div>
            )}

            <FormInput
              label="Username / No. HP"
              type="text"
              placeholder="Masukkan username atau nomor HP"
              error={errors.identifier?.message}
              disabled={isSubmitting}
              {...register('identifier')}
            />

            <div className="relative">
              <FormInput
                label="Sandi"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan sandi"
                error={errors.password?.message}
                disabled={isSubmitting}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] rounded-nb-sm p-1 text-nb-gray-500 transition-colors hover:text-nb-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-black focus-visible:-outline-offset-2"
                aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="font-mono text-[11px] font-bold text-nb-black underline underline-offset-2"
              >
                Lupa sandi?
              </Link>
            </div>

            <Button type="submit" variant="default" fullWidth loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Masuk...' : 'Masuk →'}
            </Button>
          </form>

          <p className="mt-5 text-center text-nb-caption text-nb-gray-600">
            Akun dibuat oleh admin. Hubungi <b className="text-nb-black">admin@sekar</b> jika ada kendala.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-nb-background">
          <div className="text-nb-gray-600">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
