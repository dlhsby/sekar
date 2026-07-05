'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import i18n from '@/lib/i18n/config';
import { Button } from '@/components/ui';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

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
            <div className="bg-nb-white border-2 border-nb-black shadow-nb-md p-8">
              {/* Error icon */}
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-nb-danger text-nb-white rounded-full flex items-center justify-center border-2 border-nb-black">
                  <AlertTriangle className="h-10 w-10" />
                </div>
              </div>

              {/* Error title */}
              <h1 className="text-2xl font-bold text-nb-black text-center mb-4">{i18n.t("common:appError.title")}</h1>

              {/* Error message */}
              <p className="text-nb-gray-700 text-center mb-6">{i18n.t("common:appError.authMessage")}</p>

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
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >{i18n.t("common:actions.retry")}</Button>
                <Button
                  variant="secondary"
                  onClick={this.handleLogout}
                  className="w-full"
                  leftIcon={<LogOut className="w-4 h-4" />}
                >{i18n.t("common:actions.logout")}</Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
