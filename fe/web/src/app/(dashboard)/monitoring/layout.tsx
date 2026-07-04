import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/i18n/server-metadata';

// Note: Metadata values cannot be dynamically translated in App Router layouts.
// These are served in the HTML head and cannot access i18n context.
// Translations are handled client-side in the page component.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('monitoring');
}

export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return children;
}
