
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAppSettings as fetchAppSettingsAction } from '@/actions/settingsActions';
import type { AppSettings } from '@/lib/schemas/settingsSchemas';

interface CachedSettings {
  data: AppSettings | null;
  timestamp: number | null;
  promise: Promise<AppSettings | null> | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Module-level cache
let appSettingsCache: CachedSettings = { data: null, timestamp: null, promise: null };

export function useAppSettings() {
  // Initialize settings state from cache if available and valid
  const [settings, setSettings] = useState<AppSettings | null>(() => {
    const now = Date.now();
    if (appSettingsCache.data && appSettingsCache.timestamp && (now - appSettingsCache.timestamp < CACHE_DURATION)) {
      return appSettingsCache.data;
    }
    return null;
  });

  // Initialize isLoading state
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const now = Date.now();
    // If valid cache exists, not initially loading
    if (appSettingsCache.data && appSettingsCache.timestamp && (now - appSettingsCache.timestamp < CACHE_DURATION)) {
      return false;
    }
    // If a fetch promise is already in flight, we are loading
    if (appSettingsCache.promise) {
      return true;
    }
    // Otherwise (no valid cache, no promise in flight), we need to load
    return true;
  });

  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadSettings = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // If a fetch is already in progress and not forcing a refresh, await the existing promise
    if (appSettingsCache.promise && !forceRefresh) {
      if (isMountedRef.current && !isLoading) setIsLoading(true); // Ensure isLoading is true if we are awaiting
      try {
        const result = await appSettingsCache.promise;
        if (isMountedRef.current) {
          setSettings(result); // Update local state with the result of the ongoing fetch
          setError(null);
        }
        return result;
      } catch (e: any) {
        if (isMountedRef.current) setError(e instanceof Error ? e : new Error('Previously failed to fetch settings'));
        return appSettingsCache.data; // Return old data if promise failed but cache had something
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    }

    // Check cache if not forcing refresh and no promise is in flight
    if (!forceRefresh && appSettingsCache.data && appSettingsCache.timestamp && (now - appSettingsCache.timestamp < CACHE_DURATION)) {
      if (isMountedRef.current) {
         // Ensure local state matches cache if it somehow diverged
        if(JSON.stringify(settings) !== JSON.stringify(appSettingsCache.data)) {
           setSettings(appSettingsCache.data);
        }
        setIsLoading(false);
        setError(null);
      }
      return appSettingsCache.data;
    }

    // If we reach here, we need to fetch (cache miss, expired, or forceRefresh)
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null); // Clear previous errors before a new fetch
    }

    appSettingsCache.promise = fetchAppSettingsAction();

    try {
      const fetchedSettings = await appSettingsCache.promise;
      appSettingsCache.data = fetchedSettings;
      appSettingsCache.timestamp = Date.now();
      if (isMountedRef.current) {
        setSettings(fetchedSettings);
      }
      return fetchedSettings;
    } catch (e: any) {
      console.error("useAppSettings: Error fetching app settings:", e);
      if (isMountedRef.current) {
        setError(e instanceof Error ? e : new Error('Failed to fetch settings'));
      }
      return appSettingsCache.data; 
    } finally {
      appSettingsCache.promise = null; 
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, settings]); // Keep isLoading and settings in deps to handle local state updates if cache is updated by another instance

  // Effect for initial load on mount
  useEffect(() => {
    // Only load if settings are not already populated from a valid cache by useState initializer
    if (settings === null || isLoading) { // isLoading check ensures we don't re-trigger if initial state was loading
        loadSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSettings]); // loadSettings is stable due to its own useCallback deps

  const refreshAppSettings = useCallback(() => {
    return loadSettings(true);
  }, [loadSettings]);

  return { settings, isLoading, error, refreshAppSettings };
}

export function invalidateAppSettingsCache() {
  console.log("useAppSettings: Invalidating app settings cache.");
  appSettingsCache = { data: null, timestamp: null, promise: null };
}
