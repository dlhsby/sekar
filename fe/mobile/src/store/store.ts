/**
 * Redux Store Configuration
 * Centralized state management setup
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import shiftReducer from './slices/shiftSlice';
import reportReducer from './slices/reportSlice';
import offlineReducer from './slices/offlineSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
    report: reportReducer,
    offline: offlineReducer,
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

