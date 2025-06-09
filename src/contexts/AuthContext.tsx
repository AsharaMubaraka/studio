
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from "@/lib/firebase"; // Import client-side db
import { doc, getDoc, DocumentData } from "firebase/firestore"; // Import Firestore functions
import { siteConfig } from '@/config/site'; 

interface AuthUser {
  username: string;
  name: string;
  isAdmin?: boolean;
  isRestricted?: boolean;
  pushNotificationsEnabled?: boolean; // Added field
}
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; message?: string; user?: AuthUser | null }>;
  logout: () => void;
  isLoading: boolean;
  updateUserPushPreference: (isEnabled: boolean) => void; // Method to update context
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
        // Ensure pushNotificationsEnabled has a default if missing from older storage
        if (typeof parsedUser.pushNotificationsEnabled === 'undefined') {
            parsedUser.pushNotificationsEnabled = true; 
        }
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
      const userDocRef = doc(db, "users", usernameInput);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userData = docSnap.data() as DocumentData;

        if (userData.password === passwordInput) {
          if (userData.isRestricted) {
            setIsLoading(false);
            return { success: false, message: "Account is restricted. Please contact support.", user: null };
          }

          const loggedInUser: AuthUser = {
            username: userData.username,
            name: userData.name,
            isAdmin: !!userData.isAdmin,
            isRestricted: !!userData.isRestricted,
            pushNotificationsEnabled: typeof userData.pushNotificationsEnabled === 'boolean' ? userData.pushNotificationsEnabled : true, // Default to true if not set
          };
          setUser(loggedInUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
          setIsLoading(false);
          return { success: true, user: loggedInUser };
        } else {
          setIsLoading(false);
          return { success: false, message: "Invalid username or password.", user: null };
        }
      } else {
        setIsLoading(false);
        return { success: false, message: "Invalid username or password.", user: null };
      }
    } catch (error) {
      console.error("Error during client-side login:", error);
      setIsLoading(false);
      return { success: false, message: "An unexpected error occurred during login.", user: null };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  const updateUserPushPreference = useCallback((isEnabled: boolean) => {
    setUser(currentUser => {
      if (currentUser) {
        const updatedUser = { ...currentUser, pushNotificationsEnabled: isEnabled };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    });
  }, []);


  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading, updateUserPushPreference }}>
      {children}
    </AuthContext.Provider>
  );
};
