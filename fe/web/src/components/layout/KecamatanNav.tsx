'use client';

/**
 * KecamatanNav — top-bar nav + logout for the staff_kecamatan portal (KEC-1).
 * Two destinations (Kirim Permintaan / Permintaan Saya) + a real logout. The
 * (kecamatan) layout stays a server component; this client island owns the
 * active-link state and the logout call.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/hooks';
import { cn } from '@/lib/utils/cn';

const LINKS = [
  { href: '/pruning-submit', label: 'Kirim Permintaan' },
  { href: '/pruning-submit/my', label: 'Permintaan Saya' },
];

export function KecamatanNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav aria-label="Navigasi kecamatan" className="flex items-center gap-1.5">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-nb-base border-2 px-3 py-1 text-nb-caption font-semibold uppercase tracking-wide transition-colors',
              active
                ? 'border-white bg-white/15 text-white'
                : 'border-white/30 text-white/80 hover:bg-white/10 hover:text-white',
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-nb-base border-2 border-white/30 px-3 py-1 text-nb-caption font-semibold uppercase tracking-wide text-white hover:bg-white/10"
      >
        Keluar
      </button>
    </nav>
  );
}
