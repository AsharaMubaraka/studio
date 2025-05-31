
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

// Schema for client-side form validation (used in send-notification page)
const notificationFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided, or leave empty.").optional().or(z.literal('')),
});

export type NotificationFormValues = z.infer<typeof notificationFormSchemaClient>;

export async function saveNotificationAction(
  data: { title: string; content: string; imageUrl?: string },
  author: {id: string; name: string | undefined}
) {
  try {
    await addDoc(collection(db, "notifications"), {
      title: data.title,
      content: data.content,
      authorId: author.id,
      authorName: "Admin", // Hardcoded as "Admin"
      createdAt: serverTimestamp(),
      imageUrl: data.imageUrl || null,
      readByUserIds: [], // Initialize with an empty array
    });
    return { success: true, message: "Notification sent successfully!" };
  } catch (error: any) {
    console.error("Error saving notification (Server Action):", error);
    return { success: false, message: "Failed to send notification. See server logs." };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  if (!notificationId) {
    return { success: false, message: "Notification ID is required." };
  }
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
    return { success: true, message: "Notification deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting notification (Server Action):", error);
    return { success: false, message: "Failed to delete notification. See server logs." };
  }
}

export async function markNotificationAsReadAction(notificationId: string, userId: string) {
  if (!notificationId || !userId) {
    return { success: false, message: "Notification ID and User ID are required." };
  }
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    // Check if user has already read it to prevent unnecessary updates, though arrayUnion handles duplicates.
    // For more complex logic (e.g. only add if not present), a transaction might be better,
    // but arrayUnion is idempotent for adding unique values.
    const docSnap = await getDoc(notificationRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.readByUserIds && data.readByUserIds.includes(userId)) {
            // console.log(`User ${userId} has already read notification ${notificationId}. No update needed.`);
            return { success: true, message: "Notification already marked as read by this user." };
        }
    }

    await updateDoc(notificationRef, {
      readByUserIds: arrayUnion(userId) // arrayUnion ensures the userId is added only if not already present
    });
    return { success: true, message: "Notification marked as read." };
  } catch (error: any) {
    console.error("Error marking notification as read (Server Action):", error);
    return { success: false, message: "Failed to mark notification as read. See server logs." };
  }
}
