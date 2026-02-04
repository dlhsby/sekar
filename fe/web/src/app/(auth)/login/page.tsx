'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/lib/auth/hooks';
import { getErrorMessage } from '@/lib/api/client';
import { clearAuthCookies } from '@/lib/utils/cookies';

/**
 * Login form schema with validation
 */
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username wajib diisi')
    .max(50, 'Username maksimal 50 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login Page
 *
 * Features:
 * - Username and password authentication
 * - Form validation with Zod
 * - Loading state during login
 * - Error messages
 * - Redirect after successful login
 * - Redirect parameter support (redirect to intended page)
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Get redirect URL from query params (if any)
  const redirect = searchParams.get('redirect') || '/dashboard';

  // Clear stale cookies on mount to break redirect loops
  useEffect(() => {
    clearAuthCookies();
  }, []);

  // Form with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
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
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center">
        <div className="text-nb-gray-600">Memeriksa autentikasi...</div>
      </div>
    );
  }

  // Don't render login form if already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card with Neo Brutalism styling */}
        <Card variant="elevated">
          <CardContent className="p-8">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-nb-black mb-2">SEKAR</h1>
              <p className="text-nb-gray-600 text-sm font-medium">
                Sistem Evaluasi Kerja Satgas RTH
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Global error message */}
              {error && (
                <div
                  className="p-4 bg-nb-danger-light border-3 border-nb-danger"
                  role="alert"
                >
                  <p className="text-sm text-nb-black font-medium">{error}</p>
                </div>
              )}

              {/* Username field */}
              <FormInput
                label="Username"
                type="text"
                placeholder="Masukkan username"
                error={errors.username?.message}
                disabled={isSubmitting}
                {...register('username')}
              />

              {/* Password field */}
              <FormInput
                label="Password"
                type="password"
                placeholder="Masukkan password"
                error={errors.password?.message}
                disabled={isSubmitting}
                {...register('password')}
              />

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

            {/* Info message for testing */}
            <div className="mt-6 p-4 bg-nb-gray-100 border-2 border-nb-black">
              <p className="text-sm text-nb-black font-semibold mb-2">
                Akun Testing:
              </p>
              <div className="text-xs text-nb-black space-y-1 font-medium">
                <p>Admin: admin / admin123</p>
                <p>Top Mgmt: top_management1 / password123</p>
                <p>Kepala Rayon: kepala_rayon_selatan / password123</p>
                <p>Koordinator: koordinator_bungkul / password123</p>
              </div>
            </div>
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
