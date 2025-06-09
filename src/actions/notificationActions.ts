
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, getDoc, setDoc, getDocs, query as firestoreQuery, Timestamp } from "firebase/firestore";
import { notificationCategories, type NotificationCategory } from "@/config/site";

// Schema for client-side form validation (used in send-notification page)
// This schema is what the form on the page uses.
// The actual data passed to saveNotificationAction will be slightly different.
const notificationFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be at most 100 characters."),
  content: z.string().min(2, "Content must be at least 2 characters.").max(5000, "Content must be at most 5000 characters."),
  imageUrl: z.string().url("Must be a valid URL if provided, or leave empty.").optional().or(z.literal('')),
  category: z.enum(notificationCategories).default("General").describe("The category of the notification."),
  isScheduled: z.boolean().optional().default(false),
  scheduledDate: z.string().optional(), // YYYY-MM-DD
  scheduledTime: z.string().optional(), // HH:MM
}).superRefine((data, ctx) => {
  if (data.isScheduled) {
    if (!data.scheduledDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Scheduled date is required." });
    }
    if (!data.scheduledTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledTime"], message: "Scheduled time is required." });
    }
    if (data.scheduledDate && data.scheduledTime) {
      try {
        const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
        if (scheduledDateTime < new Date()) {
          // ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Scheduled date and time must be in the future." });
          // Allowing past date for now for easier testing, can be re-enabled
        }
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledDate"], message: "Invalid date/time format." });
      }
    }
  }
});


export type NotificationFormValues = z.infer<typeof notificationFormSchemaClient>;

// Type for data passed to saveNotificationAction
interface SaveNotificationData {
  title: string;
  content: string;
  imageUrl?: string;
  category: NotificationCategory;
  scheduledAt?: Date | null; // Date object or null
}


export async function saveNotificationAction(
  data: SaveNotificationData,
  author: {id: string; name: string | undefined},
  notificationId?: string
) {
  try {
    // Validate core fields again, though client should have done it
    const coreDataSchema = z.object({
      title: z.string().min(2).max(100),
      content: z.string().min(2).max(5000),
      category: z.enum(notificationCategories),
    });
    coreDataSchema.parse({title: data.title, content: data.content, category: data.category});


    const notificationPayload: any = {
      title: data.title,
      content: data.content,
      authorId: author.id,
      authorName: author.name || "Admin",
      imageUrl: data.imageUrl || null,
      category: data.category || "General",
      scheduledAt: data.scheduledAt ? Timestamp.fromDate(data.scheduledAt) : null,
      status: data.scheduledAt ? 'scheduled' : 'sent',
      // readByUserIds will be preserved if updating, or initialized if new
    };

    if (notificationId) {
      const notificationRef = doc(db, "notifications", notificationId);
      // Ensure createdAt is not overwritten on update, and readByUserIds is merged if already present
      const existingDoc = await getDoc(notificationRef);
      const existingData = existingDoc.data();
      
      await setDoc(notificationRef, {
        ...notificationPayload,
        createdAt: existingData?.createdAt || serverTimestamp(), // Preserve original createdAt
        readByUserIds: existingData?.readByUserIds || [], // Preserve readByUserIds
      }, { merge: true }); // Use merge:true to only update specified fields
      return { success: true, message: "Notification updated successfully!" };
    } else {
      await addDoc(collection(db, "notifications"), {
        ...notificationPayload,
        createdAt: serverTimestamp(),
        readByUserIds: [],
      });
      return { success: true, message: "Notification sent/scheduled successfully!" };
    }
  } catch (error: any) {
    console.error("Error saving/updating notification (Server Action):", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: "Server validation failed.", errors: error.flatten().fieldErrors };
    }
    const actionType = notificationId ? "update" : (data.scheduledAt ? "schedule" : "send");
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

export async function markAllNotificationsAsReadForUserAction(userId: string) {
  if (!userId) {
    return { success: false, message: "User ID is required." };
  }
  try {
    const notificationsCollectionRef = collection(db, "notifications");
    const q = firestoreQuery(notificationsCollectionRef); 
    const querySnapshot = await getDocs(q);

    const updates: Promise<void>[] = [];
    let notificationsMarkedAsReadCount = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const readBy = (data.readByUserIds as string[] | undefined) || [];
      if (!readBy.includes(userId)) {
        updates.push(
          updateDoc(doc(db, "notifications", docSnap.id), {
            readByUserIds: arrayUnion(userId),
          })
        );
        notificationsMarkedAsReadCount++;
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates); 
      return { success: true, message: `${notificationsMarkedAsReadCount} notification(s) marked as read.` };
    } else {
      return { success: true, message: "All notifications were already marked as read." };
    }
  } catch (error: any) {
    console.error("Error marking all notifications as read (Server Action):", error);
    return { success: false, message: "Failed to mark all notifications as read. See server logs." };
  }
}
