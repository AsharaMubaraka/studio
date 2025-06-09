
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
  const [error, setError] = useState<Error | null>(null);

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
        if (isMountedRef.current) setError(e instanceof Error ? e : new Error('Previously failed to fetch settings'));
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
      return settings; 
    }
    
    if (isMountedRef.current) {
        if(!isLoading) setIsLoading(true);
        if(error) setError(null); 
    }
    
    appSettingsCache.promise = fetchAppSettingsAction();

    try {
      const fetchedSettings = await appSettingsCache.promise;
      appSettingsCache.data = fetchedSettings;
      appSettingsCache.timestamp = Date.now();
      if (isMountedRef.current) {
        setSettings(fetchedSettings);
        setError(null); 
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
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [settings, isLoading, error]); // Include error and isLoading in deps for loadSettings

  useEffect(() => {
    const now = Date.now();
    let needsLoad = false;

    const cacheInvalidOrExpired = !appSettingsCache.data || !appSettingsCache.timestamp || (now - appSettingsCache.timestamp >= CACHE_DURATION);

    if (error && cacheInvalidOrExpired) {
        needsLoad = true;
    } else if (!error && cacheInvalidOrExpired) {
        needsLoad = true;
    } else if (appSettingsCache.data && JSON.stringify(settings) !== JSON.stringify(appSettingsCache.data)) {
        if (isMountedRef.current) {
            setSettings(appSettingsCache.data);
            setIsLoading(false);
            setError(null);
        }
    } else if (!appSettingsCache.data && !appSettingsCache.promise && !error) {
        needsLoad = true;
    }

    if (needsLoad) {
        loadSettings().catch(err => {
            // This catch is a safety net for the promise returned by loadSettings.
            // loadSettings() itself should handle setting the error state.
            if (isMountedRef.current) {
                console.error("useAppSettings: Error caught from loadSettings() call in useEffect:", err);
                // setError(err instanceof Error ? err : new Error('Load settings failed in effect hook'));
            }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [settings, error, loadSettings]); // loadSettings is now a dependency

  const refreshAppSettings = useCallback(() => {
    if (isMountedRef.current) setError(null); 
    return loadSettings(true);
  }, [loadSettings]);

  return { settings, isLoading, error, refreshAppSettings };
}

export function invalidateAppSettingsCache() {
  console.log("useAppSettings: Invalidating app settings cache.");
  appSettingsCache = { data: null, timestamp: null, promise: null };
}
