# Implementation Guide - Phase 1 MVP (Mobile)

## Overview

Day-by-day implementation guide for SEKAR Mobile MVP.

---

## Prerequisites

Before starting, ensure:
- [x] React Native environment set up
- [x] Android Studio installed
- [x] Android emulator or device ready
- [ ] Backend API running (at least Auth endpoints)

---

## Day 6: Foundation Setup

### Goals
- Install all dependencies
- Set up API client
- Configure secure storage
- Set up state management

### Morning: Dependencies

**Install Navigation:**
```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler
```

**Install Core Libraries:**
```bash
npm install axios
npm install zustand # or @reduxjs/toolkit react-redux
npm install react-native-encrypted-storage
npm install date-fns
```

**Android Setup:**
```java
// android/app/src/main/java/.../MainActivity.java
import android.os.Bundle;

@Override
protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(null);
}
```

### Afternoon: API Client

**Create API Client:**
```typescript
// src/services/api/client.ts
import axios, { AxiosInstance } from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { API_BASE_URL } from '../../constants/config';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await EncryptedStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      await EncryptedStorage.removeItem('auth_token');
      // Navigation handled by auth state change
    }
    return Promise.reject(error);
  },
);

export default apiClient;
```

**Create Auth API:**
```typescript
// src/services/api/authApi.ts
import apiClient from './client';
import { LoginResponse, User } from '../../types/api';

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};
```

### Late Afternoon: State Management

**Create Auth Store:**
```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import EncryptedStorage from 'react-native-encrypted-storage';
import { authApi } from '../services/api/authApi';
import { User } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    await EncryptedStorage.setItem('auth_token', response.token);
    set({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await EncryptedStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await EncryptedStorage.getItem('auth_token');
      if (token) {
        const user = await authApi.getMe();
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      await EncryptedStorage.removeItem('auth_token');
      set({ isLoading: false });
    }
  },
}));
```

### End of Day 6 Checklist
- [ ] All dependencies installed
- [ ] API client working
- [ ] Secure storage configured
- [ ] Auth store created

---

## Day 7: Authentication

### Goals
- Login screen UI
- Authentication flow
- Role-based navigation

### Morning: Login Screen

**Login Screen:**
```typescript
// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';

export const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      // Navigation handled by auth state change
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SEKAR</Text>
      <Text style={styles.subtitle}>Sistem Evaluasi Kerja Satgas RTH</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#757575',
    marginBottom: 40,
  },
  form: {
    marginTop: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#F44336',
    marginBottom: 8,
  },
});
```

### Afternoon: Navigation Setup

**Root Navigator:**
```typescript
// src/navigation/RootNavigator.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { WorkerNavigator } from './WorkerNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'supervisor' || user?.role === 'admin' ? (
          <Stack.Screen name="SupervisorMain" component={SupervisorNavigator} />
        ) : (
          <Stack.Screen name="WorkerMain" component={WorkerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### End of Day 7 Checklist
- [ ] Login screen complete
- [ ] Login API integration working
- [ ] Auto-login on app open
- [ ] Role-based navigation

---

## Day 8-9: Worker Core Screens

### Day 8: Home and Clock-In/Out

**Worker Home Screen:**
```typescript
// src/screens/worker/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { shiftsApi } from '../../services/api/shiftsApi';
import { Shift } from '../../types/api';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  useEffect(() => {
    loadCurrentShift();
  }, []);

  useEffect(() => {
    if (currentShift) {
      const interval = setInterval(() => {
        const diff = Date.now() - new Date(currentShift.clock_in_time).getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimer(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentShift]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const loadCurrentShift = async () => {
    try {
      const shift = await shiftsApi.getCurrentShift();
      setCurrentShift(shift);
    } catch (error) {
      setCurrentShift(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCurrentShift();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.greeting}>Halo, {user?.full_name}! 👋</Text>

      {currentShift ? (
        <View style={styles.shiftCard}>
          <Text style={styles.shiftTitle}>Current Shift</Text>
          <Text style={styles.timer}>{timer}</Text>
          <Text style={styles.areaName}>
            {currentShift.area_name} • {currentShift.area_type}
          </Text>
        </View>
      ) : (
        <View style={styles.shiftCard}>
          <Text style={styles.noShift}>Not clocked in</Text>
          {user?.assigned_area && (
            <Text style={styles.assignedArea}>
              Assigned: {user.assigned_area.name}
            </Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('ClockInOut')}
        >
          <Text style={styles.actionButtonText}>
            {currentShift ? 'Clock Out' : 'Clock In'}
          </Text>
        </TouchableOpacity>

        {currentShift && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('Report')}
          >
            <Text style={[styles.actionButtonText, { color: '#2E7D32' }]}>
              New Report
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
```

### Day 9: Report Screen

**Report Submission Screen:**
```typescript
// src/screens/worker/ReportScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import { reportsApi } from '../../services/api/reportsApi';

const CONDITIONS = ['Baik', 'Cukup', 'Buruk'] as const;

export const ReportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      includeBase64: true,
    });

    if (result.assets && result.assets[0]) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert('Error', 'Please take a photo');
      return;
    }

    setLoading(true);

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      // Create report
      const report = await reportsApi.create({
        notes,
        condition: condition || undefined,
        gps_lat: position.coords.latitude,
        gps_lng: position.coords.longitude,
      });

      // Upload photo
      await reportsApi.uploadMedia(report.report_id, photo);

      Alert.alert('Success', 'Report submitted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.photoBox} onPress={handleTakePhoto}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>📷 Take Photo</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.notesInput}
        placeholder="Describe your work..."
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
      />
      <Text style={styles.charCount}>{notes.length}/500</Text>

      <Text style={styles.label}>Condition:</Text>
      <View style={styles.conditionRow}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.conditionButton, condition === c && styles.conditionSelected]}
            onPress={() => setCondition(condition === c ? null : c)}
          >
            <Text style={condition === c ? styles.conditionTextSelected : styles.conditionText}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!photo || loading) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!photo || loading}
      >
        <Text style={styles.submitText}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## Day 10: Offline & Location Tracking

### Morning: Offline Storage Setup

**Install WatermelonDB:**
```bash
npm install @nozbe/watermelondb @nozbe/with-observables
```

**Create Offline Queue:**
```typescript
// src/services/offline/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

interface QueueItem {
  id: string;
  type: 'clock_in' | 'clock_out' | 'report' | 'location_batch';
  data: any;
  createdAt: number;
}

export const offlineQueue = {
  add: async (type: QueueItem['type'], data: any) => {
    const queue = await offlineQueue.getAll();
    const item: QueueItem = {
      id: Date.now().toString(),
      type,
      data,
      createdAt: Date.now(),
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return item;
  },

  getAll: async (): Promise<QueueItem[]> => {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  remove: async (id: string) => {
    const queue = await offlineQueue.getAll();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  getCount: async (): Promise<number> => {
    const queue = await offlineQueue.getAll();
    return queue.length;
  },
};
```

### Afternoon: Background Location Tracking

**Install Background Geolocation:**
```bash
npm install react-native-background-geolocation
```

**Location Service:**
```typescript
// src/services/location/backgroundLocation.ts
import BackgroundGeolocation from 'react-native-background-geolocation';
import { locationApi } from '../api/locationApi';

let locationBuffer: Array<{
  timestamp: string;
  gps_lat: number;
  gps_lng: number;
  accuracy: number;
}> = [];

export const backgroundLocationService = {
  start: async () => {
    await BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 50, // meters
      stopTimeout: 5,
      debug: __DEV__,
      logLevel: __DEV__ ? BackgroundGeolocation.LOG_LEVEL_VERBOSE : BackgroundGeolocation.LOG_LEVEL_OFF,
      stopOnTerminate: false,
      startOnBoot: false,
      locationUpdateInterval: 600000, // 10 minutes
      fastestLocationUpdateInterval: 300000, // 5 minutes
    });

    BackgroundGeolocation.onLocation((location) => {
      locationBuffer.push({
        timestamp: new Date(location.timestamp).toISOString(),
        gps_lat: location.coords.latitude,
        gps_lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Upload when buffer reaches 50 or every 30 minutes
      if (locationBuffer.length >= 50) {
        backgroundLocationService.uploadBuffer();
      }
    });

    await BackgroundGeolocation.start();
  },

  stop: async () => {
    await backgroundLocationService.uploadBuffer();
    await BackgroundGeolocation.stop();
  },

  uploadBuffer: async () => {
    if (locationBuffer.length === 0) return;

    try {
      await locationApi.uploadBatch(locationBuffer);
      locationBuffer = [];
    } catch (error) {
      console.error('Failed to upload location buffer:', error);
      // Keep in buffer for next attempt
    }
  },
};
```

---

## Day 11: Supervisor Screens

### Morning: Map Dashboard

**Install Maps:**
```bash
npm install react-native-maps
```

**Map Dashboard:**
```typescript
// src/screens/supervisor/MapDashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supervisorApi } from '../../services/api/supervisorApi';
import { ActiveWorker } from '../../types/api';

export const MapDashboardScreen: React.FC = () => {
  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWorkers();
    const interval = setInterval(loadWorkers, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await supervisorApi.getActiveWorkers();
      setWorkers(data);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  };

  const initialRegion = {
    latitude: -7.2905,
    longitude: 112.7398,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {workers.map((worker) => (
          <Marker
            key={worker.worker_id}
            coordinate={{
              latitude: worker.current_gps_lat,
              longitude: worker.current_gps_lng,
            }}
            title={worker.full_name}
            description={`${worker.area_name} (${worker.area_type})`}
            pinColor="#4CAF50"
          />
        ))}
      </MapView>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Active: {workers.length}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  badge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#2E7D32',
    padding: 10,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontWeight: 'bold' },
});
```

---

## Day 12-13: Testing & Polish

### Component Tests

```typescript
// __tests__/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';

describe('LoginScreen', () => {
  it('should show error when fields are empty', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(getByText('Please enter username and password')).toBeTruthy();
    });
  });

  it('should call login on valid input', async () => {
    const mockLogin = jest.fn();
    // Mock the store...
    
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Username'), 'worker1');
    fireEvent.changeText(getByPlaceholderText('Password'), 'worker123');
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('worker1', 'worker123');
    });
  });
});
```

---

## Day 14: Build & Deploy

### Generate APK

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location
# android/app/build/outputs/apk/release/app-release.apk
```

### Signing

Create `android/app/my-release-key.keystore` and configure in `build.gradle`.

---

## Quick Reference Commands

```bash
# Development
npm start
npm run android

# Testing
npm test
npm run test:coverage

# Build
cd android && ./gradlew assembleRelease

# Clean build
cd android && ./gradlew clean
```

---

*Last Updated: January 2026*

