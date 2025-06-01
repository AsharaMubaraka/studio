
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
    if (appSettingsCache.data) return false; // Already have data
    if (appSettingsCache.promise) return true; // Fetch in progress
    const now = Date.now();
    return !appSettingsCache.timestamp || (now - appSettingsCache.timestamp >= CACHE_DURATION); // Need to fetch
  });

  // Use a ref to track if the component is mounted to avoid state updates on unmounted components
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
      // If a fetch is already in progress, await that promise
      // and ensure loading state is true until it resolves.
      if (isMountedRef.current && !isLoading) setIsLoading(true);
      try {
        const newSettings = await appSettingsCache.promise;
        if (isMountedRef.current) setSettings(newSettings);
      } catch (error) {
         // Error handled by the original promise, just ensure loading state is correct
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
      return settings; // return current state, will update on promise resolution
    }
    
    if (isMountedRef.current && !isLoading) setIsLoading(true);

    appSettingsCache.promise = fetchAppSettingsAction();

    try {
      const fetchedSettings = await appSettingsCache.promise;
      appSettingsCache.data = fetchedSettings;
      appSettingsCache.timestamp = Date.now();
      if (isMountedRef.current) setSettings(fetchedSettings);
      return fetchedSettings;
    } catch (error) {
      console.error("useAppSettings: Error fetching app settings:", error);
      if (isMountedRef.current) {
        // Decide error handling: keep stale data or clear? For now, keep stale if available.
        // setSettings(null); 
      }
      throw error; // Re-throw so callers can handle if needed
    } finally {
      appSettingsCache.promise = null; // Clear the promise once resolved
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [settings, isLoading]); // Added isLoading

  useEffect(() => {
    // This effect handles initial load or cache refresh if needed when component mounts or dependencies change.
    // It ensures that if cached data exists and is valid, it's used.
    // If not, or if cache is stale, it initiates a load.
    const now = Date.now();
    if (forceRefreshNeededOnMount()) {
      loadSettings();
    } else if (appSettingsCache.data && JSON.stringify(settings) !== JSON.stringify(appSettingsCache.data)) {
      // If global cache was updated by another hook instance
      setSettings(appSettingsCache.data);
      setIsLoading(false);
    } else if (!appSettingsCache.data && !appSettingsCache.promise) {
      // If no data and no fetch in progress (e.g. cache invalidated)
      loadSettings();
    }

    function forceRefreshNeededOnMount() {
        if (!appSettingsCache.data) return true; // No data
        if (!appSettingsCache.timestamp) return true; // No timestamp
        return (now - appSettingsCache.timestamp >= CACHE_DURATION); // Stale
    }

  }, [loadSettings, settings]); // Effect will re-run if loadSettings identity changes or local settings state changes.

  const refreshAppSettings = useCallback(() => {
    return loadSettings(true);
  }, [loadSettings]);

  return { settings, isLoading, refreshAppSettings };
}

export function invalidateAppSettingsCache() {
  console.log("useAppSettings: Invalidating app settings cache.");
  appSettingsCache = { data: null, timestamp: null, promise: null };
  // Active components using useAppSettings will see isLoading become true and will refetch.
}
