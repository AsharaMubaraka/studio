
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; name: string } | null;
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
  const [user, setUser] = useState<{ username: string; name: string } | null>(null);
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

    if (username && pass) { // Replace with actual validation
      try {
        const userRef = doc(db, "users", username);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUser({ username: username, name: userData?.name || "Unknown User" });
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: username, name: userData?.name || "Unknown User" }));
          setIsLoading(false);
          return true;
        } else {
          console.log("No such document!");
          setUser({ username: username, name: "Unknown User" });
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: username, name: "Unknown User" }));
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser({ username: username, name: "Unknown User" });
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ username: username, name: "Unknown User" }));
        setIsLoading(false);
        return true;
      }
    }
    setIsLoading(false);
    return false;
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
