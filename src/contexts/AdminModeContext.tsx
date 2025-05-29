
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useContext, useCallback } from 'react';

interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setIsAdminMode: (isAdmin: boolean) => void;
}

export const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

interface AdminModeProviderProps {
  children: ReactNode;
}

export const AdminModeProvider: React.FC<AdminModeProviderProps> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);

  const toggleAdminMode = useCallback(() => {
    setIsAdminMode(prevMode => !prevMode);
  }, []);

  return (
    <AdminModeContext.Provider value={{ isAdminMode, toggleAdminMode, setIsAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};
