/**
 * App Lifecycle Handling
 * 
 * Manages app lifecycle events for mobile:
 * - Foreground/background transitions
 * - App state changes
 * - Sync on app resume
 * - Cleanup on app pause
 */

import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { initializeSyncService, syncPendingOperations, stopPeriodicSync } from '../offline/sync-service';

// App state
let appState: 'active' | 'inactive' | 'background' = 'active';

/**
 * Initialize app lifecycle handling
 */
export async function initializeAppLifecycle(): Promise<void> {
  // Listen for app state changes
  App.addListener('appStateChange', async (state) => {
    appState = state.isActive ? 'active' : 'background';
    
    if (state.isActive) {
      await handleAppResume();
    } else {
      await handleAppPause();
    }
  });

  // Listen for back button (Android)
  App.addListener('backButton', async ({ canGoBack }) => {
    if (!canGoBack) {
      // Handle back button at root level
      App.exitApp();
    }
  });

  // Listen for URL open (deep links)
  App.addListener('appUrlOpen', async (data) => {
    console.warn('App opened with URL:', data.url);
    // Handle deep link navigation
  });

  console.warn('App lifecycle initialized');
}

/**
 * Handle app resume (foreground)
 */
async function handleAppResume(): Promise<void> {
  console.warn('App resumed');

  // Check network status
  const networkStatus = await Network.getStatus();
  
  if (networkStatus.connected) {
    // Trigger sync when coming back online
    try {
      await syncPendingOperations();
    } catch (error) {
      console.error('Sync on resume failed:', error);
    }
  }

  // Refresh data if needed
  await refreshStaleData();
}

/**
 * Handle app pause (background)
 */
async function handleAppPause(): Promise<void> {
  console.warn('App paused');

  // Stop periodic sync to save battery
  stopPeriodicSync();

  // Save any pending state
  await savePendingState();
}

/**
 * Refresh stale data
 */
async function refreshStaleData(): Promise<void> {
  // Refresh user data, property data, etc.
  // This would be implemented based on specific app needs
  console.warn('Refreshing stale data');
}

/**
 * Save pending state
 */
async function savePendingState(): Promise<void> {
  // Save any unsaved changes to local storage
  console.warn('Saving pending state');
}

/**
 * Get current app state
 */
export function getAppState(): 'active' | 'inactive' | 'background' {
  return appState;
}

/**
 * Check if app is in foreground
 */
export function isAppActive(): boolean {
  return appState === 'active';
}

/**
 * Add app state listener
 */
export function addAppStateListener(
  callback: (state: { isActive: boolean }) => void
): void {
  App.addListener('appStateChange', callback);
}

/**
 * Remove app state listener
 */
export function removeAppStateListener(): void {
  App.removeAllListeners();
}

/**
 * Handle app exit
 */
export async function handleAppExit(): Promise<void> {
  console.warn('App exiting');

  // Final sync attempt
  const networkStatus = await Network.getStatus();
  if (networkStatus.connected) {
    try {
      await syncPendingOperations();
    } catch (error) {
      console.error('Final sync failed:', error);
    }
  }

  // Save pending state
  await savePendingState();
}

/**
 * Initialize on app start
 */
export async function initializeOnAppStart(): Promise<void> {
  // Initialize sync service
  await initializeSyncService();

  // Initialize app lifecycle
  await initializeAppLifecycle();

  // Trigger initial sync if online
  const networkStatus = await Network.getStatus();
  if (networkStatus.connected) {
    await syncPendingOperations();
  }
}
