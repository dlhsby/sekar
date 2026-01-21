# State Management

Redux Toolkit state management architecture for SEKAR mobile application.

## Overview

SEKAR uses **Redux Toolkit** for predictable state management with TypeScript support. The state is organized into feature slices that mirror the application's domain model.

---

## Store Configuration

### Store Setup

**File:** `src/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import shiftReducer from './slices/shiftSlice';
import reportReducer from './slices/reportSlice';
import offlineReducer from './slices/offlineSlice';
import userReducer from './slices/userSlice';
import areaReducer from './slices/areaSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shift: shiftReducer,
    report: reportReducer,
    offline: offlineReducer,
    user: userReducer,
    area: areaReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['offline/addPendingAction'],
        // Ignore these paths in state
        ignoredPaths: ['offline.queue'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Provider Setup

**File:** `App.tsx`

```tsx
import { Provider } from 'react-redux';
import { store } from './store/store';

const App = () => {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
};
```

---

## State Slices

### 1. Auth Slice

Manages authentication state, JWT token, and logged-in user.

**File:** `src/store/slices/authSlice.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/apiClient';
import EncryptedStorage from 'react-native-encrypted-storage';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { access_token, user } = response.data;

      // Store token securely
      await EncryptedStorage.setItem('auth_token', access_token);

      return { token: access_token, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async () => {
  const token = await EncryptedStorage.getItem('auth_token');

  if (token) {
    // Verify token with backend
    const response = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { token, user: response.data };
  }

  throw new Error('No stored token');
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await EncryptedStorage.removeItem('auth_token');
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Load stored
    builder.addCase(loadStoredAuth.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 2. Shift Slice

Manages current shift state and shift history.

**File:** `src/store/slices/shiftSlice.ts`

```typescript
interface ShiftState {
  currentShift: Shift | null;
  shiftHistory: Shift[];
  loading: boolean;
  error: string | null;
}

const initialState: ShiftState = {
  currentShift: null,
  shiftHistory: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentShift = createAsyncThunk(
  'shift/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/shifts/current');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const clockIn = createAsyncThunk(
  'shift/clockIn',
  async (data: ClockInData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/shifts/clock-in', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const clockOut = createAsyncThunk(
  'shift/clockOut',
  async (data: ClockOutData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/shifts/clock-out', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const shiftSlice = createSlice({
  name: 'shift',
  initialState,
  reducers: {
    clearCurrentShift: (state) => {
      state.currentShift = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch current shift
    builder.addCase(fetchCurrentShift.fulfilled, (state, action) => {
      state.currentShift = action.payload;
      state.loading = false;
    });

    // Clock in
    builder.addCase(clockIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(clockIn.fulfilled, (state, action) => {
      state.currentShift = action.payload;
      state.loading = false;
    });
    builder.addCase(clockIn.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Clock out
    builder.addCase(clockOut.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(clockOut.fulfilled, (state, action) => {
      state.currentShift = null;
      state.shiftHistory.unshift(action.payload);
      state.loading = false;
    });
    builder.addCase(clockOut.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearCurrentShift } = shiftSlice.actions;
export default shiftSlice.reducer;
```

### 3. Report Slice

Manages work reports and submission state.

**File:** `src/store/slices/reportSlice.ts`

```typescript
interface ReportState {
  reports: Report[];
  submitting: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  submitting: false,
  loading: false,
  error: null,
};

export const submitReport = createAsyncThunk(
  'report/submit',
  async (data: ReportData, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('shift_id', data.shift_id);
      formData.append('report_type', data.report_type);
      formData.append('notes', data.notes);
      formData.append('gps_lat', data.gps_lat.toString());
      formData.append('gps_lng', data.gps_lng.toString());

      if (data.photo) {
        formData.append('photo', {
          uri: data.photo.uri,
          type: 'image/jpeg',
          name: 'report_photo.jpg',
        } as any);
      }

      const response = await apiClient.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchReports = createAsyncThunk(
  'report/fetchAll',
  async (shiftId: string) => {
    const response = await apiClient.get(`/reports?shift_id=${shiftId}`);
    return response.data;
  }
);

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Submit report
    builder.addCase(submitReport.pending, (state) => {
      state.submitting = true;
      state.error = null;
    });
    builder.addCase(submitReport.fulfilled, (state, action) => {
      state.submitting = false;
      state.reports.unshift(action.payload);
    });
    builder.addCase(submitReport.rejected, (state, action) => {
      state.submitting = false;
      state.error = action.payload as string;
    });

    // Fetch reports
    builder.addCase(fetchReports.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchReports.fulfilled, (state, action) => {
      state.loading = false;
      state.reports = action.payload;
    });
  },
});

export default reportSlice.reducer;
```

### 4. Offline Slice

Manages offline queue and sync status.

**File:** `src/store/slices/offlineSlice.ts`

```typescript
interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  queue: PendingAction[];
}

interface PendingAction {
  id: string;
  type: 'clock_in' | 'clock_out' | 'report';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

const initialState: OfflineState = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  queue: [],
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addPendingAction: (state, action: PayloadAction<PendingAction>) => {
      state.queue.push(action.payload);
      state.pendingCount += 1;
    },
    updateActionStatus: (
      state,
      action: PayloadAction<{ id: string; status: PendingAction['status'] }>
    ) => {
      const item = state.queue.find((item) => item.id === action.payload.id);
      if (item) {
        item.status = action.payload.status;
      }
    },
    removeAction: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((item) => item.id !== action.payload);
      state.pendingCount = state.queue.length;
    },
    startSync: (state) => {
      state.isSyncing = true;
    },
    finishSync: (state) => {
      state.isSyncing = false;
      state.lastSyncTime = Date.now();
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  updateActionStatus,
  removeAction,
  startSync,
  finishSync,
} = offlineSlice.actions;

export default offlineSlice.reducer;
```

---

## Custom Hooks

### Typed Selectors

```typescript
// hooks/useAuth.ts
import { useAppSelector } from '../store/store';

export const useAuth = () => {
  const { isAuthenticated, user, loading, error } = useAppSelector(
    (state) => state.auth
  );

  return { isAuthenticated, user, loading, error };
};

// hooks/useCurrentShift.ts
export const useCurrentShift = () => {
  const { currentShift, loading } = useAppSelector((state) => state.shift);

  return { currentShift, loading, isActive: !!currentShift };
};

// hooks/useOfflineStatus.ts
export const useOfflineStatus = () => {
  const { isOnline, isSyncing, pendingCount, lastSyncTime } = useAppSelector(
    (state) => state.offline
  );

  return { isOnline, isSyncing, pendingCount, lastSyncTime };
};
```

### Async Action Hooks

```typescript
// hooks/useClockIn.ts
import { useAppDispatch } from '../store/store';
import { clockIn } from '../store/slices/shiftSlice';

export const useClockIn = () => {
  const dispatch = useAppDispatch();

  const handleClockIn = async (data: ClockInData) => {
    const result = await dispatch(clockIn(data));

    if (clockIn.fulfilled.match(result)) {
      return { success: true, data: result.payload };
    } else {
      return { success: false, error: result.payload as string };
    }
  };

  return { clockIn: handleClockIn };
};
```

---

## Usage in Components

### Login Screen

```tsx
import { useAppDispatch, useAppSelector } from '../../store/store';
import { login, clearError } from '../../store/slices/authSlice';

const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result = await dispatch(login({ username, password }));

    if (login.fulfilled.match(result)) {
      // Navigate to home
      navigation.replace('Home');
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, []);

  return (
    <View>
      <TextInput value={username} onChangeText={setUsername} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button onPress={handleLogin} loading={loading}>
        Login
      </Button>
    </View>
  );
};
```

### Clock-In Screen

```tsx
import { useAppDispatch } from '../../store/store';
import { clockIn } from '../../store/slices/shiftSlice';
import { addPendingAction } from '../../store/slices/offlineSlice';

const ClockInScreen = () => {
  const dispatch = useAppDispatch();
  const { isOnline } = useOfflineStatus();

  const handleClockIn = async (data: ClockInData) => {
    if (isOnline) {
      // Online: sync immediately
      const result = await dispatch(clockIn(data));

      if (clockIn.fulfilled.match(result)) {
        Alert.alert('Berhasil', 'Anda telah absen masuk');
        navigation.goBack();
      } else {
        Alert.alert('Gagal', result.payload as string);
      }
    } else {
      // Offline: add to queue
      dispatch(
        addPendingAction({
          id: uuid.v4(),
          type: 'clock_in',
          data,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        })
      );

      Alert.alert('Offline', 'Absensi Anda akan dikirim saat online kembali');
      navigation.goBack();
    }
  };

  return <ClockInForm onSubmit={handleClockIn} />;
};
```

---

## Persistence

### Redux Persist (Optional)

For caching user data and preferences.

```typescript
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'area'], // Only persist these slices
  blacklist: ['shift', 'report'], // Don't persist these
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
```

---

## Middleware

### Network Status Middleware

```typescript
// middleware/networkMiddleware.ts
import NetInfo from '@react-native-community/netinfo';
import { setOnlineStatus, startSync } from '../slices/offlineSlice';

export const networkMiddleware = (store) => {
  NetInfo.addEventListener((state) => {
    store.dispatch(setOnlineStatus(state.isConnected && state.isInternetReachable));

    // Trigger sync when going online
    if (state.isConnected && state.isInternetReachable) {
      store.dispatch(startSync());
    }
  });

  return (next) => (action) => {
    return next(action);
  };
};
```

---

## Best Practices

### 1. Slice Organization

- One slice per feature domain
- Keep slices focused and cohesive
- Use extraReducers for async actions

### 2. Async Thunks

- Always handle pending, fulfilled, rejected states
- Use rejectWithValue for typed errors
- Return meaningful error messages

### 3. Type Safety

- Use TypeScript for all slices
- Export types from slices
- Use typed hooks (useAppDispatch, useAppSelector)

### 4. Performance

- Use selector memoization with createSelector
- Avoid unnecessary re-renders
- Keep state normalized

```typescript
import { createSelector } from '@reduxjs/toolkit';

// Memoized selector
export const selectActiveShift = createSelector(
  [(state: RootState) => state.shift.currentShift],
  (currentShift) => currentShift && !currentShift.clock_out_time
);
```

---

**Document Owner:** Mobile Developer
**Last Updated:** 2026-01-16
**Status:** Active - Phase 1
**Implementation:** `fe/mobile/src/store/`
**Dependencies:** `@reduxjs/toolkit`, `react-redux`
