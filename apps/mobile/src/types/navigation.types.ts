/**
 * Navigation Types
 * Phase 2C: Unified navigator for all 8 roles (replaces Worker/Supervisor split)
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack Navigator (Auth flow)
export type RootStackParamList = {
  // Phase 4 M3a+b entry flow gates
  Splash: undefined;
  WelcomeCarousel: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ChangePassword: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  KecamatanTabs: undefined;
};

// Main Stack Navigator — wraps the bottom tabs and surfaces the profile cluster as slide-in
// screens. Profile itself is now a bottom tab (see MainTabParamList), not a stack screen.
export type MainStackParamList = {
  Tabs: undefined;
  EditProfile: undefined;
  Settings: undefined;
  NotificationPreferences: undefined;
  ShiftHistory: undefined;
  MySchedule: undefined;
  Diagnostics: undefined;
  // Phase 4 M3d (NOTIF-1) — in-app notifications inbox; slide-in like Profile.
  // `origin` records the tab the bell was tapped from so back returns there.
  Notifications: { origin?: string } | undefined;
};

export type MainStackScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Unified Main Tab Navigator (all roles)
export type MainTabParamList = {
  // Visible tabs — uniform across all roles (Home · Menu · Profile)
  Home: undefined;
  Menu: undefined;
  Profile: undefined;
  // Feature screens — reached from the Menu launcher (registered as hidden tab screens)
  Attendance: undefined;             // attendance history list (day-grouped) — the "Kehadiran" tile
  AttendanceDetail: { date: string }; // one day's attendance detail (date = YYYY-MM-DD, WIB)
  Absensi: undefined;                // clock in/out page (reached from home + the attendance list action)
  Lembur: undefined;                 // overtime list page
  Tasks: undefined;                  // standalone tasks list (split from TasksActivities)
  Activities: undefined;             // standalone activities list (split from TasksActivities)
  Monitoring: undefined;
  // Phase 5-1 Reporting
  Reports: undefined;                // reports list
  // Phase 5-2 Analytics
  WorkerAnalytics: { workerId?: string } | undefined; // own/worker KPIs
  TeamAnalytics: { areaId?: string } | undefined;     // team/area KPIs
  // Phase 5-3 Assets
  Assets: undefined;                 // assets list
  // Hidden stack screens
  ActivitySubmission: undefined;
  ActivityDetail: { activityId: string; from?: string; fromParams?: Record<string, unknown> };
  TaskDetail: { taskId: string; from?: string; fromParams?: Record<string, unknown> };
  TaskComplete: { taskId: string };
  TaskCreate: undefined;
  OvertimeSubmit: undefined;
  OvertimeDetail: { overtimeId: string };
  ShiftHistory: undefined;
  MySchedule: undefined;
  Settings: undefined;
  EditProfile: undefined;
  // Phase 5-1 Reporting
  ReportDetail: { reportId: string };
  // Phase 5-3 Assets (hidden stack)
  AssetDetail: { assetId: string };
  QRScanner: undefined;
  AssetCheckout: { assetId: string };
  AssetReturn: { assetId: string };
  // Pruning Requests (admin_rayon flow)
  PruningReviewQueue: undefined;
  PruningDetail: {
    requestId: string;
    adminMode?: boolean;
    from?: string;
    fromParams?: Record<string, unknown>;
  };
  // Phase 3 Apr 27 — staff_kecamatan tab + redesigned submit form
  Perantingan: undefined;            // visible tab — staff_kecamatan list
  PerantinganSubmit: undefined;      // hidden stack — redesigned scrollable form
  // Phase 3 3-12 — plant seeds inventory
  PlantSeeds: undefined;             // visible tab — seed catalog list
  SeedDetail: { seedId: string };    // hidden stack — seed detail + transactions
  SeedTransactionForm: { seedId: string }; // hidden stack — record transaction form
};

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Combined navigation prop type
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
