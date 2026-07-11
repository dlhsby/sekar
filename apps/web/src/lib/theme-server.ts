/**
 * Server-side theme resolution. Reads the `sekar-theme` cookie (mirrored by the
 * theme store) so the root layout can render the `.dark` class during SSR —
 * replacing the inline no-flash script. Defaults to light when the cookie is
 * absent (first visit); the client store then applies the system preference.
 */
import { cookies } from 'next/headers';
import { THEME_STORAGE_KEY, type Theme } from '@/stores/theme';

export async function resolveServerTheme(): Promise<Theme> {
  const store = await cookies();
  return store.get(THEME_STORAGE_KEY)?.value === 'dark' ? 'dark' : 'light';
}
