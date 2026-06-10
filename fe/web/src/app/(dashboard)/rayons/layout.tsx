import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Rayon · SEKAR',
  description: 'Kelola rayon dan struktur organisasi RTH di SEKAR',
};

export default function RayonsLayout({ children }: { children: ReactNode }) {
  return children;
}
