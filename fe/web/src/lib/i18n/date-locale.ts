/**
 * Locale helpers for date formatting, driven by the active UI language.
 *
 * - `dateFnsLocale()` → the date-fns `Locale` for `format()` / react-day-picker.
 * - `intlLocale()` → the BCP-47 tag for `toLocale*String`.
 *
 * Indonesian is the default; English is the alternate. Call at render time so a
 * language switch is reflected (components that format dates should also consume
 * `useTranslation` so they re-render on `languageChanged`).
 */
import { id as idLocale, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import i18n from './config';

export const dateFnsLocale = (): Locale => (i18n.language?.startsWith('en') ? enUS : idLocale);

export const intlLocale = (): string => (i18n.language?.startsWith('en') ? 'en-US' : 'id-ID');
