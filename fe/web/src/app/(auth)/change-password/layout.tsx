import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ubah Sandi · SEKAR',
  description: 'Perbarui sandi SEKAR Anda',
};

export default function ChangePasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
