import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifikasi · SEKAR',
  description: 'Lihat notifikasi dan pembaruan SEKAR Anda',
};

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return children;
}
