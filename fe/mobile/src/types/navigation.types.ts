/**
 * Navigation Types
 * Phase 2C: Unified navigator for all 8 roles (replaces Worker/Supervisor split)
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack Navigator (Auth flow)
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  KecamatanTabs: undefined;
};

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
  ActivityDetail: { activityId: string };
  TaskDetail: { taskId: string };
  TaskComplete: { taskId: string };
  TaskCreate: undefined;
  OvertimeSubmit: undefined;
  OvertimeDetail: { overtimeId: string };
  ShiftHistory: undefined;
  Settings: undefined;
  Attendance: undefined;
  EditProfile: undefined;
  // Pruning Requests (admin_data flow)
  PruningReviewQueue: undefined;
  PruningDetail: { requestId: string; adminMode?: boolean };
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
