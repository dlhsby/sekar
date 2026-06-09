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

// Main Stack Navigator — wraps the bottom tabs and surfaces Profile as a slide-in screen
export type MainStackParamList = {
  Tabs: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  NotificationPreferences: undefined;
  ShiftHistory: undefined;
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
  // Visible tabs (role-dependent)
  Home: undefined;
  TasksActivities: { initialTab?: 'tasks' | 'activities' } | undefined;
  Overtime: undefined;
  Monitoring: undefined;
  Profile: undefined;
  // Hidden stack screens
  ClockInOut: undefined;
  ActivitySubmission: undefined;
  ActivityDetail: { activityId: string; from?: string; fromParams?: Record<string, unknown> };
  TaskDetail: { taskId: string; from?: string; fromParams?: Record<string, unknown> };
  TaskComplete: { taskId: string };
  TaskCreate: undefined;
  OvertimeSubmit: undefined;
  OvertimeDetail: { overtimeId: string };
  ShiftHistory: undefined;
  Settings: undefined;
  EditProfile: undefined;
  // Pruning Requests (admin_data flow)
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
