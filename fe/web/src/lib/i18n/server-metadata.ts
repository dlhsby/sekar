/**
 * Server-side helper for localized route metadata. Reads the active language from
 * the `sekar_lang` cookie (set by the client language switcher / i18next detector)
 * and returns the matching `{ title, description }` from `PAGE_METADATA`. Default
 * is Indonesian when the cookie is absent (e.g. first visit, public download pages).
 *
 * Usage in a `layout.tsx` / `page.tsx`:
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return pageMetadata('rayons');
 *   }
 */
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { LANGUAGE_STORAGE_KEY } from './config';
import { PAGE_METADATA, type PageMeta } from './page-metadata';

export async function resolveServerLang(): Promise<'id' | 'en'> {
  const store = await cookies();
  return store.get(LANGUAGE_STORAGE_KEY)?.value === 'en' ? 'en' : 'id';
}

type MetaKey = keyof typeof PAGE_METADATA['id'];

/** Localized `{ title, description }` for a route, resolved from the language cookie. */
export async function pageMetadata(key: MetaKey): Promise<Metadata> {
  const lang = await resolveServerLang();
  const entry = PAGE_METADATA[lang][key] as PageMeta;
  return { title: entry.title, description: entry.description };
}
