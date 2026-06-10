import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profil · SEKAR',
  description: 'Kelola profil dan preferensi pengguna SEKAR Anda',
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
