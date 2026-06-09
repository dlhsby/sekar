'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { FormInput, Button, Card, CardContent } from '@/components/ui';
import { SekarMark } from '@/components/brand/SekarMark';
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

/**
 * Login Form Component (wrapped in Suspense to fix CSR bailout)
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect URL from query params (if any)
  const redirect = searchParams.get('redirect') || '/';

  // Form with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect);
    }
  }, [user, authLoading, router, redirect]);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      // Login function will handle redirect
    } catch (err) {
      let errorMessage = getErrorMessage(err);
      // Translate common error messages to Indonesian
      if (errorMessage === 'Invalid credentials') {
        errorMessage = 'Username / No. HP atau Password salah';
      }
      setError(errorMessage);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-nb-background flex items-center justify-center">
        <div className="text-nb-gray-600">Memeriksa autentikasi...</div>
      </div>
    );
  }

  // Don't render login form if already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-nb-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card with Neo Brutalism styling */}
        <Card variant="elevated">
          <CardContent className="p-8">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <SekarMark size={56} className="mx-auto mb-3" />
              <h1 className="text-4xl font-extrabold text-nb-black mb-2">SEKAR</h1>
              <p className="text-nb-gray-600 text-sm font-medium">
                Sistem Evaluasi Kinerja Satgas RTH
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Global error message */}
              {error && (
                <div
                  className="p-4 bg-nb-danger-light border-2 border-nb-danger rounded-nb-md"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-nb-black font-medium">{error}</p>
                </div>
              )}

              {/* Identifier field (username or phone number) */}
              <FormInput
                label="Username / No. HP"
                type="text"
                placeholder="Masukkan username atau nomor HP"
                error={errors.identifier?.message}
                disabled={isSubmitting}
                {...register('identifier')}
              />

              {/* Password field with toggle */}
              <div className="relative">
                <FormInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  error={errors.password?.message}
                  disabled={isSubmitting}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-nb-gray-500 hover:text-nb-black transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="default"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Masuk...' : 'Masuk'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-nb-gray-600 text-sm mt-4">
          DLH Surabaya &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

/**
 * Login Page with Suspense boundary to prevent CSR bailout
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-nb-background flex items-center justify-center">
          <div className="text-nb-gray-600">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
