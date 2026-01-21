/**
 * SEKAR Mobile App
 * Main application entry point
 *
 * @format
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, NetworkProvider } from './src/providers';
import { syncManager } from './src/services/sync';

/**
 * Inner App component that initializes services after providers are set up
 */
function AppContent(): React.JSX.Element {
  useEffect(() => {
    // Initialize sync manager for offline queue processing
    syncManager.initialize();

    return () => {
      // Cleanup on unmount
      syncManager.cleanup();
    };
  }, []);

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </Provider>
  );
}

export default App;
