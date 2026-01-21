# Mobile Developer Reference

Advanced patterns, testing strategies, and code review guidelines for React Native development.

## Advanced Component Patterns

### Compound Components

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CardContextType {
  variant: 'default' | 'elevated';
}

const CardContext = createContext<CardContextType | null>(null);

const useCardContext = () => {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('Card components must be used within Card');
  }
  return context;
};

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated';
}

const Card = ({ children, variant = 'default' }: CardProps) => (
  <CardContext.Provider value={{ variant }}>
    <View style={[styles.card, variant === 'elevated' && styles.elevated]}>
      {children}
    </View>
  </CardContext.Provider>
);

Card.Header = ({ children }: { children: ReactNode }) => (
  <View style={styles.header}>{children}</View>
);

Card.Body = ({ children }: { children: ReactNode }) => (
  <View style={styles.body}>{children}</View>
);

Card.Footer = ({ children }: { children: ReactNode }) => (
  <View style={styles.footer}>{children}</View>
);

export { Card };

// Usage
<Card variant="elevated">
  <Card.Header><Text>Title</Text></Card.Header>
  <Card.Body><Text>Content</Text></Card.Body>
  <Card.Footer><Button title="Action" /></Card.Footer>
</Card>
```

### Render Props Pattern

```typescript
interface LocationTrackerProps {
  children: (location: LocationState) => ReactNode;
  interval?: number;
}

export const LocationTracker: React.FC<LocationTrackerProps> = ({
  children,
  interval = 30000,
}) => {
  const location = useLocation({ interval });
  return <>{children(location)}</>;
};

// Usage
<LocationTracker interval={15000}>
  {({ latitude, longitude, error }) => (
    error ? <Text>Error: {error}</Text> : <MapView coords={{ latitude, longitude }} />
  )}
</LocationTracker>
```

### HOC Pattern

```typescript
import React, { ComponentType } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { LoginScreen } from '../screens/auth/LoginScreen';

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>
): React.FC<P> {
  return function WithAuthComponent(props: P) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    if (!isAuthenticated) {
      return <LoginScreen />;
    }

    return <WrappedComponent {...props} />;
  };
}

// Usage
export default withAuth(DashboardScreen);
```

## Performance Optimization

### Memoization

```typescript
import React, { memo, useMemo, useCallback } from 'react';

// Memoized component
export const ListItem = memo<ListItemProps>(({ item, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <Text>{item.name}</Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.name === nextProps.item.name;
});

// Parent component
export const ItemList: React.FC<{ items: Item[] }> = ({ items }) => {
  // Memoized callback
  const handlePress = useCallback((id: string) => {
    console.log('Pressed:', id);
  }, []);

  // Memoized derived data
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <FlatList
      data={sortedItems}
      renderItem={({ item }) => <ListItem item={item} onPress={handlePress} />}
      keyExtractor={(item) => item.id}
    />
  );
};
```

### FlatList Optimization

```typescript
import React, { useCallback } from 'react';
import { FlatList, View, Dimensions } from 'react-native';

const ITEM_HEIGHT = 80;
const { width } = Dimensions.get('window');

export const OptimizedList: React.FC<{ data: Item[] }> = ({ data }) => {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <ListItem item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Item) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const ItemSeparator = useCallback(
    () => <View style={{ height: 1, backgroundColor: '#E0E0E0' }} />,
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ItemSeparatorComponent={ItemSeparator}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      initialNumToRender={10}
    />
  );
};
```

### Image Optimization

```typescript
import FastImage from 'react-native-fast-image';

export const OptimizedImage: React.FC<ImageProps> = ({ uri, style }) => (
  <FastImage
    style={style}
    source={{
      uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
    resizeMode={FastImage.resizeMode.cover}
    fallback={Platform.OS === 'android'}
  />
);
```

## Offline-First Patterns

### Offline Queue

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private static QUEUE_KEY = '@offline_queue';

  static async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) {
    const queue = await this.getQueue();
    const newAction: QueuedAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(newAction);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  }

  static async getQueue(): Promise<QueuedAction[]> {
    const data = await AsyncStorage.getItem(this.QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async processQueue() {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await this.getQueue();
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        await this.processAction(action);
      } catch (error) {
        if (action.retryCount < 3) {
          remaining.push({ ...action, retryCount: action.retryCount + 1 });
        }
      }
    }

    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
  }

  private static async processAction(action: QueuedAction) {
    // Process based on action type
    switch (action.type) {
      case 'CREATE_REPORT':
        await api.post('/reports', action.payload);
        break;
      case 'UPDATE_LOCATION':
        await api.post('/location', action.payload);
        break;
    }
  }
}
```

### Network State Hook

```typescript
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export const useNetwork = (): NetworkState => {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable,
        type: netState.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
};
```

## Navigation Patterns

### Type-Safe Navigation

```typescript
// types/navigation.types.ts
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  ReportDetail: { reportId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Reports: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Usage in screen
export const ReportDetailScreen: React.FC<RootStackScreenProps<'ReportDetail'>> = ({
  route,
  navigation,
}) => {
  const { reportId } = route.params;
  // ...
};
```

### Deep Linking

```typescript
// navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation.types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sekar://', 'https://sekar.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Reports: 'reports',
          Profile: 'profile',
        },
      },
      ReportDetail: 'reports/:reportId',
    },
  },
};

// App.tsx
<NavigationContainer linking={linking}>
  {/* navigators */}
</NavigationContainer>
```

## Testing Strategies

### Mock Setup

```typescript
// __mocks__/setup.ts
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock';

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// NetInfo
jest.mock('@react-native-community/netinfo', () => mockRNCNetInfo);

// Geolocation
jest.mock('react-native-geolocation-service', () => ({
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Callout: View,
    PROVIDER_GOOGLE: 'google',
  };
});

// react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
```

### Test Utilities

```typescript
// test/utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import { RootState, rootReducer } from '../src/store/store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: PreloadedState<RootState>;
  store?: ReturnType<typeof configureStore>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: rootReducer,
      preloadedState,
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
```

### Navigation Testing

```typescript
import { renderWithProviders } from '../../test/utils';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';

const Stack = createNativeStackNavigator();

const TestNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Detail" component={DetailScreen} />
  </Stack.Navigator>
);

describe('Navigation', () => {
  it('navigates to detail screen on button press', async () => {
    const { getByText, findByText } = renderWithProviders(<TestNavigator />);

    fireEvent.press(getByText('View Details'));

    expect(await findByText('Detail Screen')).toBeTruthy();
  });
});
```

## Code Review Guidelines

### Critical Issues (Must Fix)

1. **Memory Leaks**
   - Uncleared timeouts/intervals in useEffect
   - Event listeners not removed
   - Subscriptions not unsubscribed

2. **Security Vulnerabilities**
   - Sensitive data in AsyncStorage (use EncryptedStorage)
   - API keys in source code
   - Logging sensitive data

3. **Crash Risks**
   - Uncaught promise rejections
   - Accessing undefined properties
   - Missing null checks

### Warnings (Should Fix)

1. **Performance Issues**
   - Inline functions in render (causes re-renders)
   - Missing keys in lists
   - Large images not optimized

2. **Accessibility Problems**
   - Missing accessibilityLabel
   - Small touch targets
   - Poor color contrast

3. **Type Safety**
   - Usage of `any` type
   - Missing prop types
   - Untyped API responses

### Suggestions (Nice to Have)

1. **Code Quality**
   - Extract magic numbers to constants
   - Split large components
   - Add JSDoc comments

2. **Testing**
   - Add edge case tests
   - Improve test descriptions
   - Add integration tests

## Platform-Specific Code

### Conditional Rendering

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: Platform.select({ ios: 20, android: 16 }),
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
});
```

### Platform-Specific Files

```
components/
  Button/
    Button.tsx          # Shared logic
    Button.ios.tsx      # iOS specific
    Button.android.tsx  # Android specific
    index.tsx           # Re-export
```

### Native Module Usage

```typescript
import { NativeModules, Platform } from 'react-native';

const { CustomModule } = NativeModules;

export const performNativeAction = async () => {
  if (Platform.OS === 'ios') {
    return CustomModule.performActionIOS();
  } else {
    return CustomModule.performActionAndroid();
  }
};
```

## Error Boundaries

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Report to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong</Text>
          <Button title="Try Again" onPress={this.handleRetry} />
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Debugging Tips

```typescript
// Enable React Native Debugger
// Shake device or Cmd+D (iOS) / Cmd+M (Android)

// Console logging with tags
const log = (tag: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(`[${tag}]`, ...args);
  }
};

// Redux DevTools
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: rootReducer,
  devTools: __DEV__,
});

// Flipper for network inspection
// Automatically enabled in debug builds
```
