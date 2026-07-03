import { ReactNode } from 'react';
import type { Metadata } from 'next';

// Note: Metadata values cannot be dynamically translated in App Router layouts.
// These are served in the HTML head and cannot access i18n context.
// Translations are handled client-side in the page component.
export const metadata: Metadata = {
  title: 'Real-time Monitoring · SEKAR',
  description: 'Monitor real-time locations and status of RTH field staff',
};

export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return children;
}
