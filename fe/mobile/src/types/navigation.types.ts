/**
 * Navigation Types
 * TypeScript type definitions for React Navigation
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack Navigator (Auth flow)
export type RootStackParamList = {
  Login: undefined;
  WorkerTabs: undefined;
  SupervisorTabs: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Worker Tab Navigator
export type WorkerTabParamList = {
  WorkerHome: undefined;
  ClockInOut: undefined;
  Report: undefined;
  TasksReports: { activeTab?: 'tasks' | 'reports' } | undefined;
  ReportDetail: { reportId: string; isWorkerView?: boolean };
  Profile: undefined;
  ShiftHistory: undefined;
  TaskDetail: { taskId: string };
  TaskComplete: { taskId: string };
};

export type WorkerTabScreenProps<T extends keyof WorkerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<WorkerTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Supervisor Tab Navigator
export type SupervisorTabParamList = {
  MapDashboard: undefined;
  ReportsList: undefined;
  ReportDetail: { reportId: string; isWorkerView?: boolean };
  Attendance: undefined;
  Profile: undefined;
};

export type SupervisorTabScreenProps<T extends keyof SupervisorTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<SupervisorTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Combined navigation prop type
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

