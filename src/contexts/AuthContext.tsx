
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { siteConfig } from '@/config/site'; // Import siteConfig

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

const AUTH_STORAGE_KEY = `${siteConfig.name.toLowerCase().replace(/\s+/g, '_')}_auth`; // Dynamic key

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
          isRestricted: !!parsedUser.isRestricted,
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
    try {
      const userRef = doc(db, "users", username);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.password !== pass) {
             setIsLoading(false);
             return false;
        }
        if (userData.isRestricted) {
            setIsLoading(false);
            return false;
        }

        const loggedInUser = {
          username: username,
          name: userData?.name || "Unknown User",
          isAdmin: !!userData?.isAdmin,
          isRestricted: !!userData?.isRestricted,
        };
        setUser(loggedInUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
        setIsLoading(false);
        return true;
      } else {
        console.warn("AuthContext.login: User not found or initial checks failed:", username);
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
