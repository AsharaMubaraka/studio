
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; name: string; isAdmin?: boolean } | null; // Added isAdmin
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
        setUser(JSON.parse(storedAuth));
      }
    } catch (error) {
      console.error("Failed to load auth state from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username && pass) { // Replace with actual validation (password check happens in LoginForm)
      try {
        const userRef = doc(db, "users", username);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const loggedInUser = {
            username: username,
            name: userData?.name || "Unknown User",
            isAdmin: userData?.isAdmin || false // Fetch isAdmin status
          };
          setUser(loggedInUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
          setIsLoading(false);
          return true;
        } else {
          // This case should ideally be handled by the LoginForm's check before calling login
          // For safety, if a user record isn't found but login is called, treat as non-admin
          console.log("User document not found in Firestore during login:", username);
          const loggedInUser = {
            username: username,
            name: "Unknown User", // Or perhaps don't set user if doc not found
            isAdmin: false
          };
          setUser(loggedInUser); // Or setUser(null) and return false
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
          setIsLoading(false);
          return true; // Or false depending on how strict you want to be
        }
      } catch (error) {
        console.error("Error fetching user data during login:", error);
        // Handle error, perhaps set user to null or a default state
        const loggedInUser = {
            username: username,
            name: "Error User",
            isAdmin: false
        };
        setUser(loggedInUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
        setIsLoading(false);
        return true; // Or false
      }
    }
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Optionally clear AdminModeContext as well if needed
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
