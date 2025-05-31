
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
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
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["youtubeId"],
      message: "YouTube Video ID is required when source type is YouTube.",
    });
  }
  if (data.sourceType === "iframe" && (!data.iframeCode || data.iframeCode.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["iframeCode"],
      message: "iFrame code is required when source type is iFrame.",
    });
  }
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date.",
    });
  }
});

export type RelayFormValues = z.infer<typeof relaySchema>;

export async function saveRelayAction(data: RelayFormValues) {
  try {
    const validatedData = relaySchema.parse(data);

    await addDoc(collection(db, "live_relays"), {
      name: validatedData.name,
      startDate: Timestamp.fromDate(parseISO(validatedData.startDate)),
      endDate: Timestamp.fromDate(parseISO(validatedData.endDate)),
      sourceType: validatedData.sourceType,
      youtubeId: validatedData.sourceType === "youtube" ? validatedData.youtubeId : null,
      iframeCode: validatedData.sourceType === "iframe" ? validatedData.iframeCode : null,
      adminUsername: validatedData.adminUsername,
      createdAt: serverTimestamp(),
    });
    return { success: true, message: "Live Relay Miqaat saved successfully!" };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    console.error("Error saving relay (Server Action):", error);
    return { success: false, message: "Failed to save relay. See server logs." };
  }
}

export async function deleteRelayAction(relayId: string) {
  if (!relayId) {
    return { success: false, message: "Relay ID is required." };
  }
  try {
    const relayRef = doc(db, "live_relays", relayId);
    await deleteDoc(relayRef);
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
}

export async function fetchRelays(): Promise<LiveRelay[]> {
  const relaysCollectionRef = collection(db, "live_relays");
  const q = query(relaysCollectionRef, orderBy("startDate", "desc")); // Order by start date
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
    };
  });
}
