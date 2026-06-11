/**
 * useTabState — manage main tab (tasks/activities) state
 */

import { useState } from 'react';

export type MainTabType = 'tasks' | 'activities';

export interface UseTabStateResult {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
}

export function useTabState(initialTab: MainTabType = 'tasks'): UseTabStateResult {
  const [activeTab, setActiveTab] = useState<MainTabType>(initialTab);
  return { activeTab, setActiveTab };
}
