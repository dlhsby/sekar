import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Pengguna · SEKAR',
  description: 'Kelola pengguna dan penetapan peran di SEKAR',
};

export default function UsersLayout({ children }: { children: ReactNode }) {
  return children;
}
