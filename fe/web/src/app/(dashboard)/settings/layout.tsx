import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pengaturan · SEKAR',
  description: 'Kelola pengaturan sistem SEKAR',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
