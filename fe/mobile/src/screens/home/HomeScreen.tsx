/**
 * Home — role-aware anchor (hi-fi HOME-1/2/3).
 *
 * The single screen mounted by `MainNavigator`'s "Beranda" tab for every role
 * that has one. It dispatches to the per-role dashboard variant:
 *   - satgas / linmas        → FieldHomeScreen   (HOME-1) ✅
 *   - korlap / kepala_rayon  → CoordinatorHomeScreen (HOME-2) — next checkpoint
 *   - admin_data             → AdminDataHomeScreen   (HOME-3) — next checkpoint
 * Until HOME-2/HOME-3 land, every Home-tab role gets the field dashboard
 * (unchanged from before the dispatcher was introduced).
 */
import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { FieldHomeScreen } from './FieldHomeScreen';

export function HomeScreen(): React.JSX.Element {
  const role = useAppSelector((state) => state.auth.user?.role);

  switch (role) {
    // case 'korlap':
    // case 'kepala_rayon':
    //   return <CoordinatorHomeScreen />;
    // case 'admin_data':
    //   return <AdminDataHomeScreen />;
    default:
      return <FieldHomeScreen />;
  }
}

export default HomeScreen;
