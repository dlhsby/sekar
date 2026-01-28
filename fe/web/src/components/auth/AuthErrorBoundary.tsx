'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { NBButton } from '@/components/nb/NBButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Auth Error Boundary
 *
 * Catches authentication-related errors and displays a friendly error page
 * with options to retry or logout.
 *
 * @example
 * ```tsx
 * <AuthErrorBoundary>
 *   <ProtectedContent />
 * </AuthErrorBoundary>
 * ```
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Authentication error:', error);
    console.error('Error info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleLogout = () => {
    // Clear cookies and redirect to login
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-nb-white border-3 border-nb-black shadow-nb-md p-8">
              {/* Error icon */}
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-nb-danger text-nb-white rounded-full flex items-center justify-center border-3 border-nb-black">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Error title */}
              <h1 className="text-2xl font-bold text-nb-black text-center mb-4">
                Terjadi Kesalahan
              </h1>

              {/* Error message */}
              <p className="text-nb-gray-700 text-center mb-6">
                Terjadi kesalahan saat memproses autentikasi. Silakan coba lagi atau keluar dan
                masuk kembali.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-nb-gray-100 border-2 border-nb-gray-300 overflow-auto">
                  <p className="text-xs font-mono text-nb-gray-700">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <NBButton variant="primary" onClick={this.handleRetry} fullWidth>
                  Coba Lagi
                </NBButton>
                <NBButton variant="secondary" onClick={this.handleLogout} fullWidth>
                  Keluar
                </NBButton>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
