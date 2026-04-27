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
import monitoringReducer from './slices/monitoringSlice';
import monitoringV2Reducer from './slices/monitoringV2Slice';
import plantsReducer from './slices/plantsSlice';
import pruningRequestsReducer from './slices/pruningRequestsSlice';
import serviceCapacityReducer from './slices/serviceCapacitySlice';
import plantSeedsReducer from './slices/plantSeedsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
    activities: activitiesReducer,
    offline: offlineReducer,
    tasks: tasksReducer,
    notifications: notificationsReducer,
    overtime: overtimeReducer,
    monitoring: monitoringReducer,
    monitoringV2: monitoringV2Reducer,
    plants: plantsReducer,
    pruningRequests: pruningRequestsReducer,
    serviceCapacity: serviceCapacityReducer,
    plantSeeds: plantSeedsReducer,
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
