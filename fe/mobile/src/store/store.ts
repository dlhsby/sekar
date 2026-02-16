/**
 * Redux Store Configuration
 * Phase 2C: activities replaces report, overtime added
 */

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import shiftReducer from './slices/shiftSlice';
import activitiesReducer from './slices/activitiesSlice';
import offlineReducer from './slices/offlineSlice';
import tasksReducer from './slices/tasksSlice';
import notificationsReducer from './slices/notificationsSlice';
import overtimeReducer from './slices/overtimeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
    activities: activitiesReducer,
    offline: offlineReducer,
    tasks: tasksReducer,
    notifications: notificationsReducer,
    overtime: overtimeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['shift/setCurrentShift'],
        ignoredActionPaths: ['payload.timestamp'],
        ignoredPaths: ['shift.currentShift'],
      },
    }),
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
