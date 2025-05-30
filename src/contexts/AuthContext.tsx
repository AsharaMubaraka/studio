
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; name: string; isAdmin?: boolean } | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_STORAGE_KEY = 'anjuman_hub_auth';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ username: string; name: string; isAdmin?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const parsedUser = JSON.parse(storedAuth);
        // Ensure isAdmin is explicitly handled as a boolean, defaulting to false
        setUser({ 
          ...parsedUser, 
          isAdmin: !!parsedUser.isAdmin // Converts to boolean, false if undefined/null/0/""
        });
      }
    } catch (error) {
      console.error("Failed to load auth state from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call for login validation if needed, here we just fetch user data
    // Password validation should happen in LoginForm before calling this
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

    if (username && pass) { // pass is used for the check, actual validation is in LoginForm
      try {
        const userRef = doc(db, "users", username);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const loggedInUser = {
            username: username,
            name: userData?.name || "Unknown User",
            isAdmin: !!userData?.isAdmin // Ensure isAdmin is a boolean, defaults to false
          };
          setUser(loggedInUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
          setIsLoading(false);
          return true;
        } else {
          // This case is handled by LoginForm (user not found or password mismatch)
          // For AuthContext, if login is called but doc isn't found, it's an invalid login attempt
          console.warn("AuthContext.login called for a user not found in Firestore, or password validation failed prior:", username);
          setIsLoading(false);
          return false; // Indicate login failure to LoginForm
        }
      } catch (error) {
        console.error("Error fetching user data during login:", error);
        setIsLoading(false);
        return false; // Indicate login failure
      }
    }
    // Fallback if username/pass not provided (should be caught by form validation)
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Optionally, reset AdminModeContext here if needed
    // Example: if you had a function like `resetAdminMode()` from useAdminMode()
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
