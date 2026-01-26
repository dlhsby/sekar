/**
 * Redux Store Configuration
 * Centralized state management setup
 */

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import shiftReducer from './slices/shiftSlice';
import reportReducer from './slices/reportSlice';
import offlineReducer from './slices/offlineSlice';
import tasksReducer from './slices/tasksSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
    report: reportReducer,
    offline: offlineReducer,
    tasks: tasksReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['shift/setCurrentShift'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
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

