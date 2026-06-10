import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Import Data · SEKAR',
  description: 'Import data area, pengguna, dan jadwal ke SEKAR',
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return children;
}
