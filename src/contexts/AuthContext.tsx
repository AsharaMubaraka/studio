
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; name: string; isAdmin?: boolean; isRestricted?: boolean } | null;
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
  const [user, setUser] = useState<{ username: string; name: string; isAdmin?: boolean; isRestricted?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const parsedUser = JSON.parse(storedAuth);
        setUser({
          ...parsedUser,
          isAdmin: !!parsedUser.isAdmin,
          isRestricted: !!parsedUser.isRestricted, // Load isRestricted status
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
    // Password validation and restriction check happens in LoginForm before calling this
    try {
      const userRef = doc(db, "users", username);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Ensure password matches (this is redundant if LoginForm already did it, but safe)
        if (userData.password !== pass) {
             setIsLoading(false);
             return false; // Password mismatch
        }
        // Ensure user is not restricted (redundant if LoginForm checked, but safe)
        if (userData.isRestricted) {
            setIsLoading(false);
            return false; // User restricted
        }

        const loggedInUser = {
          username: username,
          name: userData?.name || "Unknown User",
          isAdmin: !!userData?.isAdmin,
          isRestricted: !!userData?.isRestricted, // Store restriction status
        };
        setUser(loggedInUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
        setIsLoading(false);
        return true;
      } else {
        console.warn("AuthContext.login: User not found in Firestore or initial checks failed:", username);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error fetching user data during login:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
