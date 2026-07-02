/**
 * Bundled translation resources for the mobile app.
 *
 * Namespaced JSON, mirrored between `id` and `en` and kept key-compatible with
 * the web console (`fe/web/src/lib/i18n`). `errors` mirrors the backend
 * `ApiErrorCode` enum — keep them in sync.
 */
import idCommon from './locales/id/common.json';
import idAuth from './locales/id/auth.json';
import idErrors from './locales/id/errors.json';
import idValidation from './locales/id/validation.json';
import idRoles from './locales/id/roles.json';
import idStatus from './locales/id/status.json';
import idSettings from './locales/id/settings.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';
import enRoles from './locales/en/roles.json';
import enStatus from './locales/en/status.json';
import enSettings from './locales/en/settings.json';

export const resources = {
  id: {
    common: idCommon,
    auth: idAuth,
    errors: idErrors,
    validation: idValidation,
    roles: idRoles,
    status: idStatus,
    settings: idSettings,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    errors: enErrors,
    validation: enValidation,
    roles: enRoles,
    status: enStatus,
    settings: enSettings,
  },
} as const;

export const NAMESPACES = [
  'common',
  'auth',
  'errors',
  'validation',
  'roles',
  'status',
  'settings',
] as const;

export const SUPPORTED_LANGUAGES = ['id', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'id';
export const LANGUAGE_STORAGE_KEY = 'sekar_lang';
