
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

// This schema is for client-side form validation, not directly used by the server action's signature here.
const notificationFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content must be at most 1000 characters."),
  imageUrl: z.string().url().optional(), // Added for image URL
});

export type NotificationFormValues = z.infer<typeof notificationFormSchema>;

// Server Action updated to accept imageUrl
export async function saveNotificationAction(
  data: { title: string; content: string },
  author: {id: string; name: string | undefined},
  imageUrl?: string // Optional imageUrl
) {
  try {
    await addDoc(collection(db, "notifications"), {
      title: data.title,
      content: data.content,
      authorId: author.id,
      authorName: "Admin",
      createdAt: serverTimestamp(),
      imageUrl: imageUrl || null, // Save imageUrl or null
    });
    return { success: true, message: "Notification sent successfully!" };
  } catch (error: any) {
    console.error("Error saving notification (Server Action):", error);
    // Avoid ZodError check here as data is not directly Zod-parsed in this function signature
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
