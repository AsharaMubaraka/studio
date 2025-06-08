
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
    const validatedData = appSettingsSchema.parse(data); // Use imported schema
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);

    await setDoc(settingsRef, {
      webViewUrl: validatedData.webViewUrl ? String(validatedData.webViewUrl).trim() : null, // Trim here on save too
      logoUrl: validatedData.logoUrl || null,
      updateLogoOnLogin: validatedData.logoUrl ? validatedData.updateLogoOnLogin : false,
      updateLogoOnSidebar: validatedData.logoUrl ? validatedData.updateLogoOnSidebar : false,
      updateLogoOnProfileAvatar: validatedData.logoUrl ? validatedData.updateLogoOnProfileAvatar : false,
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
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Cast to AppSettings to ensure type conformity
      const settings: AppSettings = {
        webViewUrl: data.webViewUrl ? String(data.webViewUrl).trim() : null, // Trimmed here
        logoUrl: data.logoUrl || null,
        updateLogoOnLogin: data.logoUrl ? !!data.updateLogoOnLogin : false,
        updateLogoOnSidebar: data.logoUrl ? !!data.updateLogoOnSidebar : false,
        updateLogoOnProfileAvatar: data.logoUrl ? !!data.updateLogoOnProfileAvatar : false,
      };
      return settings;
    }
    return null; // No settings configured yet
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return null; 
  }
}
