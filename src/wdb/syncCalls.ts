import { User } from '../classes';
import { syncUserData, initializeSync } from './syncService';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function setupAppSync(user: User) {
  let subscription: any;
  let periodicSyncCleanup: () => void;

  // 1. Initial sync and setup
  initializeSync().then(sub => {
    subscription = sub;
  });

  // 2. Sync when app comes to foreground
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      syncUserData();
    }
  });

  // 3. Sync when network connectivity is restored
  const netInfoSubscription = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncUserData();
    }
  });

  // 4. Setup periodic sync
  const setupPeriodicSync = () => {
    const interval = setInterval(async () => {
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);
      if (isConnected) {
        syncUserData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  };

  periodicSyncCleanup = setupPeriodicSync();

  // Return cleanup function
  return () => {
    subscription?.unsubscribe();
    appStateSubscription.remove();
    netInfoSubscription();
    periodicSyncCleanup();
  };
}

// Helper function for manual sync
export async function manualSync() {
  return await syncUserData();
} 