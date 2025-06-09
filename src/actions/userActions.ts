
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

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
