
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";

// Schema for client-side form validation (used in send-notification page)
const notificationFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided, or leave empty.").optional().or(z.literal('')),
});

export type NotificationFormValues = z.infer<typeof notificationFormSchemaClient>;

export async function saveNotificationAction(
  data: { title: string; content: string; imageUrl?: string },
  author: {id: string; name: string | undefined},
  notificationId?: string // Optional: ID for updating an existing notification
) {
  try {
    const notificationData = {
      title: data.title,
      content: data.content,
      authorId: author.id, // The ID of the admin performing the action
      authorName: "Admin", // Consistent author name as per requirements
      imageUrl: data.imageUrl || null,
      // readByUserIds will be preserved if updating, or initialized if new
    };

    if (notificationId) {
      // Update existing notification
      const notificationRef = doc(db, "notifications", notificationId);
      // To preserve readByUserIds and createdAt, we merge the new data
      // If you want to update 'updatedAt', add it here: updatedAt: serverTimestamp()
      await setDoc(notificationRef, {
        ...notificationData,
        // createdAt should not be overwritten on update. If doc doesn't exist, setDoc creates it.
        // If you want an "updatedAt" field, you would add:
        // updatedAt: serverTimestamp(),
      }, { merge: true }); // Merge to avoid overwriting fields like readByUserIds
      return { success: true, message: "Notification updated successfully!" };
    } else {
      // Create new notification
      await addDoc(collection(db, "notifications"), {
        ...notificationData,
        createdAt: serverTimestamp(),
        readByUserIds: [], // Initialize for new notifications
      });
      return { success: true, message: "Notification sent successfully!" };
    }
  } catch (error: any) {
    console.error("Error saving/updating notification (Server Action):", error);
    const actionType = notificationId ? "update" : "send";
    return { success: false, message: `Failed to ${actionType} notification. See server logs.` };
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
    const docSnap = await getDoc(notificationRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.readByUserIds && data.readByUserIds.includes(userId)) {
            return { success: true, message: "Notification already marked as read by this user." };
        }
    }

    await updateDoc(notificationRef, {
      readByUserIds: arrayUnion(userId)
    });
    return { success: true, message: "Notification marked as read." };
  } catch (error: any) {
    console.error("Error marking notification as read (Server Action):", error);
    return { success: false, message: "Failed to mark notification as read. See server logs." };
  }
}
