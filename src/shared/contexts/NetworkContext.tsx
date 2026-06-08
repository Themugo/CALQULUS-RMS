/**
 * Network Context
 * 
 * Provides network status detection and adaptive UI support:
 * - Network status monitoring
 * - Online/offline detection
 * - Network quality assessment
 * - Adaptive UI components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Network } from '@capacitor/network';

// Network status interface
export interface NetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  effectiveType?: '2g' | '3g' | '4g' | 'unknown';
}

// Network context interface
interface NetworkContextType {
  status: NetworkStatus;
  isOnline: boolean;
  isSlowNetwork: boolean;
  isFastNetwork: boolean;
  refreshStatus: () => Promise<void>;
}

// Create context
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Provider props
interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Network Provider Component
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  const [status, setStatus] = useState<NetworkStatus>({
    connected: true,
    connectionType: 'unknown',
    networkQuality: 'good',
  });

  /**
   * Refresh network status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const networkStatus = await Network.getStatus();
      
      const networkQuality = determineNetworkQuality(networkStatus);
      
      setStatus({
        connected: networkStatus.connected,
        connectionType: networkStatus.connectionType,
        networkQuality,
        effectiveType: (networkStatus as any).networkType,
      });
    } catch (error) {
      console.error('Failed to refresh network status:', error);
    }
  }, []);

  /**
   * Determine network quality
   */
  const determineNetworkQuality = (networkStatus: { connected: boolean; connectionType: string }): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!networkStatus.connected) {
      return 'poor';
    }

    switch (networkStatus.connectionType) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        return 'good';
      default:
        return 'good';
    }
  };

  // Initialize network status
  useEffect(() => {
    refreshStatus();

    // Listen for network changes
    const listener = Network.addListener('networkStatusChange', async (networkStatus) => {
      const networkQuality = determineNetworkQuality(networkStatus);
      
      setStatus({
        connected: networkStatus.connected,
        connectionType: networkStatus.connectionType,
        networkQuality,
        effectiveType: (networkStatus as any).networkType,
      });
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [refreshStatus]);

  const contextValue: NetworkContextType = {
    status,
    isOnline: status.connected,
    isSlowNetwork: !status.connected || status.networkQuality === 'poor' || status.networkQuality === 'fair',
    isFastNetwork: status.connected && (status.networkQuality === 'excellent' || status.networkQuality === 'good'),
    refreshStatus,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Use network context hook
 */
function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  
  return context;
}

/**
 * Network Status Banner Component
 */
export function NetworkStatusBanner() {
  const { isOnline } = useNetwork();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
    } else {
      // Hide after 3 seconds when coming back online
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!visible) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center ${
      isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {isOnline ? (
        <p className="text-sm font-medium">You're back online</p>
      ) : (
        <p className="text-sm font-medium">
          You're offline. Some features may not be available.
        </p>
      )}
    </div>
  );
}

/**
 * Offline Mode Indicator Component
 */
export function OfflineModeIndicator() {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium">Offline Mode</span>
    </div>
  );
}

/**
 * Network Quality Indicator Component
 */
export function NetworkQualityIndicator() {
  const { isOnline, status } = useNetwork();

  if (!isOnline) return null;

  const qualityColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 border border-gray-200">
      <div className={`w-2 h-2 ${qualityColors[status.networkQuality]} rounded-full`} />
      <span className="text-xs text-gray-600 capitalize">{status.networkQuality}</span>
    </div>
  );
}

/**
 * With Network Check HOC
 * Wraps a component to only render when online
 */
function withNetworkCheck<P extends object>(
  Component: React.ComponentType<P>,
  offlineMessage?: string
) {
  return function NetworkCheckedComponent(props: P) {
    const { isOnline } = useNetwork();

    if (!isOnline) {
      return (
        <div className="flex items-center justify-center p-8 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium">Offline</p>
            <p className="text-sm">{offlineMessage || 'This feature requires an internet connection.'}</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Adaptive Loading Component
 * Shows different loading states based on network quality
 */
export function AdaptiveLoading({ message }: { message?: string }) {
  const { status, isOnline } = useNetwork();

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-600">Waiting for connection...</p>
      </div>
    );
  }

  const showDetailedLoading = status.networkQuality === 'excellent' || status.networkQuality === 'good';

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <p className="mt-4 text-sm text-gray-600">{message || 'Loading...'}</p>
      {showDetailedLoading && (
        <p className="mt-2 text-xs text-gray-400 capitalize">{status.networkQuality} connection</p>
      )}
    </div>
  );
}
