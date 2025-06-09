
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Removed direct Firestore imports as login logic moves to API
import { siteConfig } from '@/config/site'; 

interface AuthUser {
  username: string;
  name: string;
  isAdmin?: boolean;
  isRestricted?: boolean;
}
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; message?: string; user?: AuthUser | null }>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_STORAGE_KEY = `${siteConfig.name.toLowerCase().replace(/\s+/g, '_')}_auth`;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const parsedUser = JSON.parse(storedAuth) as AuthUser;
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Failed to load auth state from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; message?: string; user?: AuthUser | null }> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        const loggedInUser: AuthUser = {
          username: data.user.username,
          name: data.user.name,
          isAdmin: !!data.user.isAdmin,
          isRestricted: !!data.user.isRestricted,
        };
        setUser(loggedInUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
        setIsLoading(false);
        return { success: true, user: loggedInUser };
      } else {
        setIsLoading(false);
        return { success: false, message: data.error || "Login failed", user: null };
      }
    } catch (error) {
      console.error("Error calling login API:", error);
      setIsLoading(false);
      return { success: false, message: "An unexpected error occurred during login.", user: null };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Optionally, could call an /api/logout route if server-side session cleanup is needed
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
