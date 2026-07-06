/**
 * Bundled translation resources for the web console. Namespaced JSON mirrored
 * id/en; keys portable with mobile. `errors` mirrors the backend ApiErrorCode
 * enum. Add a namespace on BOTH platforms + here (parity guardrail enforces).
 */
import idCommon from './locales/id/common.json';
import idAuth from './locales/id/auth.json';
import idErrors from './locales/id/errors.json';
import idValidation from './locales/id/validation.json';
import idRoles from './locales/id/roles.json';
import idStatus from './locales/id/status.json';
import idSettings from './locales/id/settings.json';
import idTasks from './locales/id/tasks.json';
import idActivities from './locales/id/activities.json';
import idOvertime from './locales/id/overtime.json';
import idAttendance from './locales/id/attendance.json';
import idMonitoring from './locales/id/monitoring.json';
import idReports from './locales/id/reports.json';
import idPlants from './locales/id/plants.json';
import idPruning from './locales/id/pruning.json';
import idSeeds from './locales/id/seeds.json';
import idAdmin from './locales/id/admin.json';
import idHome from './locales/id/home.json';
import idMenu from './locales/id/menu.json';
import idProfile from './locales/id/profile.json';
import idNotifications from './locales/id/notifications.json';
import idAnalytics from './locales/id/analytics.json';
import idAssets from './locales/id/assets.json';
import idSchedules from './locales/id/schedules.json';
import idOnboarding from './locales/id/onboarding.json';
import idImport from './locales/id/import.json';
import idInstallHelp from './locales/id/install-help.json';
import idNavigation from './locales/id/navigation.json';
import idComponents from './locales/id/components.json';
import idDatabase from './locales/id/database.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';
import enRoles from './locales/en/roles.json';
import enStatus from './locales/en/status.json';
import enSettings from './locales/en/settings.json';
import enTasks from './locales/en/tasks.json';
import enActivities from './locales/en/activities.json';
import enOvertime from './locales/en/overtime.json';
import enAttendance from './locales/en/attendance.json';
import enMonitoring from './locales/en/monitoring.json';
import enReports from './locales/en/reports.json';
import enPlants from './locales/en/plants.json';
import enPruning from './locales/en/pruning.json';
import enSeeds from './locales/en/seeds.json';
import enAdmin from './locales/en/admin.json';
import enHome from './locales/en/home.json';
import enMenu from './locales/en/menu.json';
import enProfile from './locales/en/profile.json';
import enNotifications from './locales/en/notifications.json';
import enAnalytics from './locales/en/analytics.json';
import enAssets from './locales/en/assets.json';
import enSchedules from './locales/en/schedules.json';
import enOnboarding from './locales/en/onboarding.json';
import enImport from './locales/en/import.json';
import enInstallHelp from './locales/en/install-help.json';
import enNavigation from './locales/en/navigation.json';
import enDatabase from './locales/en/database.json';
import idLocation from './locales/id/location.json';
import enLocation from './locales/en/location.json';
import idWelcome from './locales/id/welcome.json';
import enWelcome from './locales/en/welcome.json';
import enComponents from './locales/en/components.json';

export const resources = {
  id: {
    common: idCommon,
    auth: idAuth,
    errors: idErrors,
    validation: idValidation,
    roles: idRoles,
    status: idStatus,
    settings: idSettings,
    tasks: idTasks,
    activities: idActivities,
    overtime: idOvertime,
    attendance: idAttendance,
    monitoring: idMonitoring,
    reports: idReports,
    plants: idPlants,
    pruning: idPruning,
    seeds: idSeeds,
    admin: idAdmin,
    home: idHome,
    menu: idMenu,
    profile: idProfile,
    notifications: idNotifications,
    analytics: idAnalytics,
    assets: idAssets,
    schedules: idSchedules,
    onboarding: idOnboarding,
    import: idImport,
    'install-help': idInstallHelp,
    navigation: idNavigation,
    location: idLocation,
    welcome: idWelcome,
    components: idComponents,
    database: idDatabase,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    errors: enErrors,
    validation: enValidation,
    roles: enRoles,
    status: enStatus,
    settings: enSettings,
    tasks: enTasks,
    activities: enActivities,
    overtime: enOvertime,
    attendance: enAttendance,
    monitoring: enMonitoring,
    reports: enReports,
    plants: enPlants,
    pruning: enPruning,
    seeds: enSeeds,
    admin: enAdmin,
    home: enHome,
    menu: enMenu,
    profile: enProfile,
    notifications: enNotifications,
    analytics: enAnalytics,
    assets: enAssets,
    schedules: enSchedules,
    onboarding: enOnboarding,
    import: enImport,
    'install-help': enInstallHelp,
    navigation: enNavigation,
    location: enLocation,
    welcome: enWelcome,
    components: enComponents,
    database: enDatabase,
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
  'tasks',
  'activities',
  'overtime',
  'attendance',
  'monitoring',
  'reports',
  'plants',
  'pruning',
  'seeds',
  'admin',
  'home',
  'menu',
  'profile',
  'notifications',
  'analytics',
  'assets',
  'schedules',
  'onboarding',
  'import',
  'install-help',
  'navigation',
  'location',
  'welcome',
  'components',
  'database',
] as const;

export const SUPPORTED_LANGUAGES = ['id', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'id';
