import Link from 'next/link';
import { ArrowLeft, Lock, MessageCircle, Phone } from 'lucide-react';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL, SUPPORT_WHATSAPP } from '@/lib/constants/support';

export const metadata = {
  title: 'Lupa Sandi',
};

/**
 * Forgot-password — informational page (mirrors mobile AS-4). No API call: a
 * SEKAR password can only be reset by an admin, so this lists the support
 * hotline (WhatsApp + phone) and a link back to login.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-nb-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLockup size={44} subtitle={null} />
        </div>

        <div className="rounded-nb-md border-2 border-nb-black bg-nb-white p-6 shadow-nb-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-primary-soft">
            <Lock className="size-6 text-nb-black" aria-hidden="true" />
          </div>

          <h1 className="text-nb-h2 text-nb-black">Sandi tidak bisa di-reset sendiri</h1>
          <p className="mt-2 text-nb-body-sm text-nb-gray-700">
            Demi keamanan, sandi hanya bisa diatur ulang oleh admin. Hubungi admin melalui WhatsApp
            atau telepon untuk mendapatkan sandi sementara.
          </p>

          <div className="mt-5 space-y-3">
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-nb-base border-2 border-nb-black bg-status-active-bg p-3 shadow-nb-xs transition-shadow hover:shadow-nb-sm"
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-nb-black bg-nb-white">
                <MessageCircle className="size-4 text-status-active" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
                  WhatsApp
                </span>
                <span className="block text-nb-body-sm font-bold text-nb-black">
                  +{SUPPORT_WHATSAPP}
                </span>
              </span>
            </a>

            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="flex items-center gap-3 rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-xs transition-shadow hover:shadow-nb-sm"
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-nb-black bg-accent-mint">
                <Phone className="size-4 text-nb-black" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-nb-gray-600">
                  Telepon
                </span>
                <span className="block text-nb-body-sm font-bold text-nb-black">{SUPPORT_PHONE}</span>
              </span>
            </a>
          </div>

          <div className="mt-5 rounded-nb-base border-2 border-dashed border-nb-gray-400 bg-nb-paper p-3">
            <p className="text-nb-caption text-nb-gray-700">
              Admin akan memberi sandi sementara. Saat login pertama, Anda akan diminta membuat sandi
              baru.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-nb-gray-700 hover:text-nb-black"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
