import { redirect } from 'next/navigation';

/**
 * Root page redirects to login
 * In production, this will check auth and redirect to dashboard if authenticated
 */
export default function HomePage() {
  // For now, redirect to login page
  // In Phase 2D-2, we'll add auth check here
  redirect('/login');
}
