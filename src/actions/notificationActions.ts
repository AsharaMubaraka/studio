
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

// Define the schema for notification form values here, as the action needs to know the shape.
const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content must be at most 1000 characters."),
});

export type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export async function saveNotificationAction(data: NotificationFormValues, author: {id: string; name: string | undefined}) {
  try {
    await addDoc(collection(db, "notifications"), {
      title: data.title,
      content: data.content,
      authorId: author.id,
      authorName: "Admin", // Changed to "Admin"
      createdAt: serverTimestamp(),
      // status: 'new' // You might want a default status for all users
    });
    return { success: true, message: "Notification sent successfully!" };
  } catch (error: any) {
    console.error("Error saving notification (Server Action):", error);
    if (error instanceof z.ZodError) {
        return { success: false, message: "Invalid data provided on server. " + error.errors.map(e => e.message).join(', ') };
    }
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
  } catch (error: any) {
    console.error("Error deleting notification (Server Action):", error);
    return { success: false, message: "Failed to delete notification. See server logs." };
  }
}

