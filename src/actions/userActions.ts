
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

const updateUserDisplayNameSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  newName: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name must be at most 100 characters."),
});

export async function updateUserDisplayNameAction(userId: string, newName: string) {
  try {
    const validatedData = updateUserDisplayNameSchema.parse({ userId, newName });

    const userDocRef = doc(db, "users", validatedData.userId);
    await updateDoc(userDocRef, {
      name: validatedData.newName,
    });

    return { success: true, message: "User display name updated successfully." };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    console.error("Error updating user display name (Server Action):", error);
    return { success: false, message: "Failed to update user display name. See server logs." };
  }
}

const saveFcmTokenSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  token: z.string().min(1, "FCM token is required."),
});

export async function saveUserFcmTokenAction(userId: string, token: string) {
  try {
    const validatedData = saveFcmTokenSchema.parse({ userId, token });
    const userDocRef = doc(db, "users", validatedData.userId);
    await updateDoc(userDocRef, {
      fcmToken: validatedData.token,
      fcmTokenLastUpdated: serverTimestamp(),
    });
    return { success: true, message: "FCM token saved successfully." };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed for FCM token.", errors: error.flatten().fieldErrors };
    }
    console.error("Error saving FCM token (Server Action):", error);
    return { success: false, message: "Failed to save FCM token. See server logs." };
  }
}

const updateUserPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
});

export async function updateUserPasswordAction(userId: string, currentPasswordP: string, newPasswordP: string) {
  try {
    const validatedData = updateUserPasswordSchema.parse({ 
      userId, 
      currentPassword: currentPasswordP, 
      newPassword: newPasswordP 
    });

    const userDocRef = doc(db, "users", validatedData.userId);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      return { success: false, message: "User not found." };
    }

    const userData = docSnap.data();
    // Plaintext password comparison
    if (userData.password !== validatedData.currentPassword) {
      return { success: false, message: "Incorrect current password." };
    }

    await updateDoc(userDocRef, {
      password: validatedData.newPassword, // Storing new password in plaintext
    });

    return { success: true, message: "Password updated successfully." };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // Return a structured error for the client to potentially display field-specific messages
      return { 
        success: false, 
        message: "Validation failed. Please check the fields.", 
        errors: error.flatten().fieldErrors 
      };
    }
    console.error("Error updating user password (Server Action):", error);
    // General error message for other types of errors
    return { success: false, message: "Failed to update password. An unexpected error occurred." };
  }
}

const updateUserPushNotificationPreferenceSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  isEnabled: z.boolean(),
});

export async function updateUserPushNotificationPreferenceAction(userId: string, isEnabled: boolean) {
  try {
    const validatedData = updateUserPushNotificationPreferenceSchema.parse({ userId, isEnabled });

    const userDocRef = doc(db, "users", validatedData.userId);
    await updateDoc(userDocRef, {
      pushNotificationsEnabled: validatedData.isEnabled,
    });

    return { success: true, message: "Push notification preference updated successfully." };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    console.error("Error updating push notification preference (Server Action):", error);
    return { success: false, message: "Failed to update push notification preference. See server logs." };
  }
}
