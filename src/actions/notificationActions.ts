
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

// Schema for client-side form validation
const notificationFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided.").optional().or(z.literal('')),
});

export type NotificationFormValues = z.infer<typeof notificationFormSchemaClient>;

// Server Action updated to include imageUrl
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
      imageUrl: data.imageUrl || null, // Save imageUrl
    });
    return { success: true, message: "Notification sent successfully!" };
  } catch (error: any) {
    console.error("Error saving notification (Server Action):", error);
    return { success: false, message: "Failed to send notification. See server logs." };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  "use server";
  if (!notificationId) {
    return { success: false, message: "Notification ID is required." };
  }
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
    return { success: true, message: "Notification deleted successfully!" };
  } catch (error: any)
{
    console.error("Error deleting notification (Server Action):", error);
    return { success: false, message: "Failed to delete notification. See server logs." };
  }
}

