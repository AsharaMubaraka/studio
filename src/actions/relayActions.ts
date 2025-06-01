
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, orderBy, Timestamp, setDoc, updateDoc } from "firebase/firestore";
import { parseISO } from "date-fns";

const relaySchema = z.object({
  name: z.string().min(2, "Miqaat name must be at least 2 characters.").max(100),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  sourceType: z.enum(["youtube", "iframe"]),
  youtubeId: z.string().optional(),
  iframeCode: z.string().optional(),
  adminUsername: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.sourceType === "youtube" && (!data.youtubeId || data.youtubeId.trim() === "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["youtubeId"], message: "YouTube Video ID is required." });
  }
  if (data.sourceType === "iframe" && (!data.iframeCode || data.iframeCode.trim() === "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["iframeCode"], message: "iFrame code is required." });
  }
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date." });
  }
});

export type RelayFormValues = z.infer<typeof relaySchema>;

export async function saveRelayAction(data: RelayFormValues, relayIdToUpdate?: string) {
  try {
    const validatedData = relaySchema.parse(data);

    const relayPayload = {
      name: validatedData.name,
      startDate: Timestamp.fromDate(parseISO(validatedData.startDate)),
      endDate: Timestamp.fromDate(parseISO(validatedData.endDate)),
      sourceType: validatedData.sourceType,
      youtubeId: validatedData.sourceType === "youtube" ? validatedData.youtubeId : null,
      iframeCode: validatedData.sourceType === "iframe" ? validatedData.iframeCode : null,
      adminUsername: validatedData.adminUsername, // User who created/last updated
      // createdAt will be set only on creation
      // active_viewers subcollection is managed client-side
    };

    if (relayIdToUpdate) {
      const relayRef = doc(db, "live_relays", relayIdToUpdate);
      // Using updateDoc to only change specified fields + updatedAt (if you add it)
      // To preserve createdAt and any other fields not in relayPayload, use updateDoc.
      // If you want an "updatedAt" field:
      // await updateDoc(relayRef, { ...relayPayload, updatedAt: serverTimestamp() });
      await updateDoc(relayRef, relayPayload); // This updates only fields in relayPayload
      return { success: true, message: "Live Relay Miqaat updated successfully!" };
    } else {
      await addDoc(collection(db, "live_relays"), {
        ...relayPayload,
        createdAt: serverTimestamp(),
      });
      return { success: true, message: "Live Relay Miqaat saved successfully!" };
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    console.error("Error saving/updating relay (Server Action):", error);
    const actionType = relayIdToUpdate ? "update" : "save";
    return { success: false, message: `Failed to ${actionType} relay. See server logs.` };
  }
}

export async function deleteRelayAction(relayId: string) {
  if (!relayId) {
    return { success: false, message: "Relay ID is required." };
  }
  try {
    const relayRef = doc(db, "live_relays", relayId);
    await deleteDoc(relayRef);
    // Note: Deleting a document does NOT automatically delete its subcollections in Firestore.
    // If 'active_viewers' subcollection needs cleanup, it must be done separately (e.g., a Firebase Function).
    return { success: true, message: "Relay Miqaat deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting relay (Server Action):", error);
    return { success: false, message: "Failed to delete relay. See server logs." };
  }
}

export interface LiveRelay {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  sourceType: "youtube" | "iframe";
  youtubeId?: string | null;
  iframeCode?: string | null;
  adminUsername: string;
  createdAt: Date;
  // updatedAt?: Date; // Optional: if you add it
}

export async function fetchRelays(): Promise<LiveRelay[]> {
  const relaysCollectionRef = collection(db, "live_relays");
  const q = query(relaysCollectionRef, orderBy("startDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      startDate: (data.startDate as Timestamp).toDate(),
      endDate: (data.endDate as Timestamp).toDate(),
      sourceType: data.sourceType,
      youtubeId: data.youtubeId,
      iframeCode: data.iframeCode,
      adminUsername: data.adminUsername,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      // updatedAt: (data.updatedAt as Timestamp)?.toDate(), // Optional
    };
  });
}
