import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masuk · SEKAR',
  description: 'Masuk ke dashboard SEKAR dengan username atau nomor ponsel Anda',
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
