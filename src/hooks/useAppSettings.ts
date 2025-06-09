
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
  const [settings, setSettings] = useState<AppSettings | null>(appSettingsCache.data);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (appSettingsCache.data) return false;
    if (appSettingsCache.promise) return true;
    const now = Date.now();
    return !appSettingsCache.timestamp || (now - appSettingsCache.timestamp >= CACHE_DURATION);
  });
  const [error, setError] = useState<Error | null>(null); // New error state

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadSettings = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh && appSettingsCache.data && appSettingsCache.timestamp && (now - appSettingsCache.timestamp < CACHE_DURATION)) {
      if (JSON.stringify(settings) !== JSON.stringify(appSettingsCache.data)) {
        if (isMountedRef.current) setSettings(appSettingsCache.data);
      }
      if (isMountedRef.current) setIsLoading(false);
      return appSettingsCache.data;
    }

    if (appSettingsCache.promise && !forceRefresh) {
      if (isMountedRef.current && !isLoading) setIsLoading(true);
      try {
        const newSettings = await appSettingsCache.promise;
        if (isMountedRef.current) setSettings(newSettings);
      } catch (e: any) {
        // Error is handled by the original promise's catch block
        if (isMountedRef.current) setError(e instanceof Error ? e : new Error('Previously failed to fetch settings'));
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
      return settings;
    }
    
    if (isMountedRef.current) {
        if(!isLoading) setIsLoading(true);
        if(error) setError(null); // Reset error on new load attempt
    }
    

    appSettingsCache.promise = fetchAppSettingsAction();

    try {
      const fetchedSettings = await appSettingsCache.promise;
      appSettingsCache.data = fetchedSettings;
      appSettingsCache.timestamp = Date.now();
      if (isMountedRef.current) {
        setSettings(fetchedSettings);
        setError(null); // Clear error on success
      }
      return fetchedSettings;
    } catch (e: any) {
      console.error("useAppSettings: Error fetching app settings:", e);
      if (isMountedRef.current) {
        setError(e instanceof Error ? e : new Error('Failed to fetch settings'));
        // Optionally, decide if you want to clear settings or keep stale ones:
        // setSettings(null); // To clear settings on error
      }
      return appSettingsCache.data; // Return stale data or null if no stale data
    } finally {
      appSettingsCache.promise = null;
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [settings, isLoading, error]);

  useEffect(() => {
    const now = Date.now();
    let needsLoad = false;

    const shouldForceRefresh = () => {
        if (!appSettingsCache.data) return true;
        if (!appSettingsCache.timestamp) return true;
        return (now - appSettingsCache.timestamp >= CACHE_DURATION);
    };

    if (error) { // If there's an error, don't attempt to autoload unless cache is forced invalid
        if (shouldForceRefresh()) { // Allow re-fetch if cache expired despite error
            needsLoad = true;
        }
    } else if (shouldForceRefresh()) {
        needsLoad = true;
    } else if (appSettingsCache.data && JSON.stringify(settings) !== JSON.stringify(appSettingsCache.data)) {
        // Sync with global cache if it was updated by another instance
        if (isMountedRef.current) {
            setSettings(appSettingsCache.data);
            setIsLoading(false);
            setError(null);
        }
    } else if (!appSettingsCache.data && !appSettingsCache.promise) {
        // Initial load if no data, no promise, and no error
        needsLoad = true;
    }

    if (needsLoad) {
        loadSettings();
    }
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, error]); // Intentionally excluding loadSettings from deps to control its invocation more manually

  const refreshAppSettings = useCallback(() => {
    if (isMountedRef.current) setError(null); // Clear previous error on manual refresh
    return loadSettings(true);
  }, [loadSettings]);

  return { settings, isLoading, error, refreshAppSettings };
}

export function invalidateAppSettingsCache() {
  console.log("useAppSettings: Invalidating app settings cache.");
  appSettingsCache = { data: null, timestamp: null, promise: null };
}
