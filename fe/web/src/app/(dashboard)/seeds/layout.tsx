import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Bibit · SEKAR',
  description: 'Kelola inventaris bibit dan transaksi di SEKAR',
};

export default function SeedsLayout({ children }: { children: ReactNode }) {
  return children;
}
