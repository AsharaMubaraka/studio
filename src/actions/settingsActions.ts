
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { AppSettingsFormValues, AppSettings } from "@/lib/schemas/settingsSchemas"; // Import from new location
import { appSettingsSchema } from "@/lib/schemas/settingsSchemas"; // Import schema for internal use

const SETTINGS_COLLECTION = "app_settings";
const GLOBAL_CONFIG_DOC_ID = "global_config";

export async function updateAppSettingsAction(data: AppSettingsFormValues) {
  try {
    const validatedData = appSettingsSchema.parse(data);
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);

    await setDoc(settingsRef, {
      webViewUrl: validatedData.webViewUrl ? String(validatedData.webViewUrl).trim() : null,
      logoUrl: validatedData.logoUrl || null,
      updateLogoOnLogin: validatedData.logoUrl ? validatedData.updateLogoOnLogin : false,
      updateLogoOnSidebar: validatedData.logoUrl ? validatedData.updateLogoOnSidebar : false,
      updateLogoOnProfileAvatar: validatedData.logoUrl ? validatedData.updateLogoOnProfileAvatar : false,
      showLiveRelayPage: validatedData.showLiveRelayPage,
    }, { merge: true });

    return { success: true, message: "App settings updated successfully." };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    console.error("Error updating app settings (Server Action):", error);
    return { success: false, message: "Failed to update app settings. See server logs." };
  }
}

export async function fetchAppSettings(): Promise<AppSettings | null> {
  console.log("[fetchAppSettings] Action called.");
  if (!db) {
    console.error("[fetchAppSettings] Firestore 'db' instance is not available at the start of the action.");
    // Attempt to log the type or state of 'db' if it's not what's expected
    if (typeof db === 'undefined') {
        console.error("[fetchAppSettings] 'db' is undefined.");
    } else {
        console.error("[fetchAppSettings] 'db' is defined but falsy. Value:", db);
    }
    return null;
  }
  try {
    console.log(`[fetchAppSettings] Attempting to get doc: ${SETTINGS_COLLECTION}/${GLOBAL_CONFIG_DOC_ID}`);
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);
    if (!settingsRef) {
        // This case should ideally not happen if `doc` doesn't throw and `db` is valid.
        console.error("[fetchAppSettings] Failed to get settingsRef from doc(). 'db' might be an issue or doc() returned falsy.");
        return null;
    }
    console.log("[fetchAppSettings] settingsRef created. Calling getDoc...");
    const docSnap = await getDoc(settingsRef);
    console.log("[fetchAppSettings] getDoc call completed.");

    if (docSnap.exists()) {
      console.log("[fetchAppSettings] Document exists.");
      const data = docSnap.data();
      const settings: AppSettings = {
        webViewUrl: data.webViewUrl ? String(data.webViewUrl).trim() : null,
        logoUrl: data.logoUrl || null,
        updateLogoOnLogin: data.logoUrl ? !!data.updateLogoOnLogin : false,
        updateLogoOnSidebar: data.logoUrl ? !!data.updateLogoOnSidebar : false,
        updateLogoOnProfileAvatar: data.logoUrl ? !!data.updateLogoOnProfileAvatar : false,
        showLiveRelayPage: typeof data.showLiveRelayPage === 'boolean' ? data.showLiveRelayPage : true,
      };
      console.log("[fetchAppSettings] Returning settings:", JSON.stringify(settings)); // Log returned settings
      return settings;
    }
    
    console.warn(`[fetchAppSettings] App settings document (${SETTINGS_COLLECTION}/${GLOBAL_CONFIG_DOC_ID}) not found in Firestore. Returning null.`);
    return null;
  } catch (error: any) {
    console.error("[fetchAppSettings] Error during Firestore operation (getDoc or processing):", error);
    // Log more details if possible, e.g., error.code, error.message
    if (error.code) console.error(`[fetchAppSettings] Firestore error code: ${error.code}`);
    if (error.message) console.error(`[fetchAppSettings] Firestore error message: ${error.message}`);
    return null; 
  }
}
