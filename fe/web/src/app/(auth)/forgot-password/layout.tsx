import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lupa Sandi · SEKAR',
  description: 'Hubungi administrator Anda untuk mereset sandi SEKAR',
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
