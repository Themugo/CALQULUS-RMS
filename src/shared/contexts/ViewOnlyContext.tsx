/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

interface ViewOnlyContextType {
  isViewOnly: boolean;
  /** True for webhosts — they cannot write anything in manager views */
  isWebhostViewing: boolean;
}

const ViewOnlyContext = createContext<ViewOnlyContextType>({
  isViewOnly: false,
  isWebhostViewing: false,
});

export const useViewOnly = () => useContext(ViewOnlyContext);

export const ViewOnlyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();

  // Webhosts viewing manager pages are always view-only
  const isWebhostViewing = userRole?.role === 'webhost';

  // isViewOnly = webhost (cannot write) OR unapproved manager
  const isViewOnly =
    isWebhostViewing ||
    (userRole?.role === 'manager' && userRole?.approval_status !== 'approved');

  return (
    <ViewOnlyContext.Provider value={{ isViewOnly, isWebhostViewing }}>
      {children}
    </ViewOnlyContext.Provider>
  );
};
