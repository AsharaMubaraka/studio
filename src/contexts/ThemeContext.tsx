
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'anjuman_hub_theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light'); // Default to light, will be updated by useEffect

  useEffect(() => {
    // This effect runs only on the client
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialTheme: Theme;
    if (storedTheme) {
      initialTheme = storedTheme;
    } else {
      initialTheme = prefersDark ? 'dark' : 'light';
    }
    
    setThemeState(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // To prevent flash of unstyled content or incorrect theme on initial load,
  // we render children only after the theme has been determined.
  // Alternatively, a more complex setup with a script in _document.js (for Pages Router)
  // or careful handling of `suppressHydrationWarning` on `<html>` would be needed.
  // For App Router and client-side theme determination, delaying child rendering until theme is set is safer.
  if (typeof window === 'undefined' && !theme) {
    // Still on the server or theme not yet determined on client
    return null; 
  }


  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
