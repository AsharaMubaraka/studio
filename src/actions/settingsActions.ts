
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const SETTINGS_COLLECTION = "app_settings";
const GLOBAL_CONFIG_DOC_ID = "global_config";

export const appSettingsSchema = z.object({
  webViewUrl: z.string().url("Please enter a valid URL for the web view.").or(z.literal('')).optional(),
  logoUrl: z.string().url("Please enter a valid URL for the logo.").or(z.literal('')).optional(),
});

export type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export async function updateAppSettingsAction(data: AppSettingsFormValues) {
  try {
    const validatedData = appSettingsSchema.parse(data);
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);

    await setDoc(settingsRef, {
      webViewUrl: validatedData.webViewUrl || null,
      logoUrl: validatedData.logoUrl || null,
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

export interface AppSettings {
  webViewUrl?: string | null;
  logoUrl?: string | null;
}

export async function fetchAppSettings(): Promise<AppSettings | null> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_DOC_ID);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        webViewUrl: data.webViewUrl || null,
        logoUrl: data.logoUrl || null,
      };
    }
    return null; // No settings configured yet
  } catch (error) {
    console.error("Error fetching app settings:", error);
    // Return null or throw error, depending on how you want to handle this in the UI
    return null; 
  }
}
