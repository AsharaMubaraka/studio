
"use server";

import { z } from "zod";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin"; // adminDb for Firestore, adminStorage for Storage
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, orderBy, Timestamp, updateDoc, increment } from "firebase/firestore";
import { getDownloadURL } from "firebase-admin/storage";
import { Readable } from "stream";

// Target storage bucket from the new Firebase project
const TARGET_STORAGE_BUCKET_NAME = "lnv-fmb.appspot.com";

const mediaFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
});

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export interface MediaItem {
  id: string; // Firestore document ID
  title: string;
  description?: string;
  imageUrl: string; // Public URL from Firebase Storage
  filePath: string; // Full path in Firebase Storage (e.g., media_gallery/filename.jpg)
  uploaderId: string;
  uploaderName?: string;
  createdAt: Date;
  downloadCount: number;
}

export async function uploadImageAction(formData: FormData, author: {id: string; name?: string}) {
  console.log("[uploadImageAction] Action started.");
  
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const rawFile = formData.get("file");

  console.log(`[uploadImageAction] Raw title: '${String(rawTitle)}', type: ${typeof rawTitle}`);
  console.log(`[uploadImageAction] Raw description: '${String(rawDescription)}', type: ${typeof rawDescription}`);
  console.log(`[uploadImageAction] Raw file: ${String(rawFile)}, type: ${typeof rawFile}, instanceof File: ${rawFile instanceof File}`);

  if (rawFile instanceof File) {
    console.log(`[uploadImageAction] File details - name: ${rawFile.name}, size: ${rawFile.size}, type: ${rawFile.type}`);
  }

  const title = typeof rawTitle === 'string' && rawTitle.trim() !== "null" ? rawTitle.trim() : "";
  const descriptionForZod = typeof rawDescription === 'string' && rawDescription.trim() !== "null" ? rawDescription.trim() : undefined;
  const file = rawFile instanceof File ? rawFile : null;

  try {
    console.log(`[uploadImageAction] Validating with Zod: title='${title}', description='${descriptionForZod}'`);
    mediaFormSchema.parse({ title, description: descriptionForZod });
    
    if (!file) {
      console.error("[uploadImageAction] File validation failed: No file or invalid file object received on server.");
      throw new Error("No file or invalid file provided. Ensure a file is selected.");
    }
    if (file.size > 25 * 1024 * 1024) { // 25MB limit
        console.error(`[uploadImageAction] File validation failed: File too large. Size: ${file.size}`);
        throw new Error("File is too large. Max 25MB allowed.");
    }
    if (!file.type.startsWith("image/")) {
        console.error(`[uploadImageAction] File validation failed: Invalid file type. Type: ${file.type}`);
        throw new Error("Invalid file type. Only images are allowed.");
    }

    if (!adminStorage) {
        console.error("[uploadImageAction] Firebase Admin Storage is not initialized. Check server logs for firebaseAdmin.ts issues.");
        throw new Error("Server configuration error: Firebase Admin Storage not available.");
    }
    
    console.log("[uploadImageAction] File validation passed. Preparing for Firebase Storage upload.");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = Date.now();
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
    const filePath = `media_gallery/${timestamp}_${originalFileName}`;

    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const fileUpload = bucket.file(filePath);

    console.log(`[uploadImageAction] Uploading to Firebase Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePath}`);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.type,
      },
      public: true, // Make the file publicly readable
    });

    await new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        console.error('Firebase Storage upload stream error:', err);
        reject(err);
      });
      stream.on('finish', () => {
        console.log('[uploadImageAction] Firebase Storage upload successful.');
        resolve(true);
      });
      stream.end(buffer);
    });

    const publicUrl = await getDownloadURL(fileUpload);
    console.log(`[uploadImageAction] Public URL: ${publicUrl}`);

    if (!adminDb) {
      console.error("[uploadImageAction] Firebase Admin Firestore (adminDb) is not initialized.");
      throw new Error("Server configuration error: Firestore not available.");
    }

    console.log("[uploadImageAction] Saving metadata to Firestore.");
    await addDoc(collection(adminDb, "media_gallery"), {
      title,
      description: descriptionForZod,
      imageUrl: publicUrl,
      filePath: filePath, // Store the path for deletion
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
      downloadCount: 0,
    });
    console.log("[uploadImageAction] Successfully saved to Firestore.");
    return { success: true, message: "Image uploaded and saved successfully!" };

  } catch (error: any) {
    console.error("[uploadImageAction Caught Error] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const errorMessage = error.message || "An_unknown_error_occurred_during_image_upload._Check_server_logs.";
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    return { success: false, message: errorMessage };
  }
}

export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  if (!adminDb) {
    console.error("[getGalleryImagesAction] Firebase Admin Firestore (adminDb) is not initialized.");
    return [];
  }
  try {
    const mediaCollectionRef = collection(adminDb, "media_gallery");
    const q = query(mediaCollectionRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        filePath: data.filePath,
        uploaderId: data.uploaderId,
        uploaderName: data.uploaderName,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        downloadCount: data.downloadCount || 0,
      };
    });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

export async function deleteImageAction(filePathToDelete: string, docId: string) {
  if (!adminStorage || !adminDb) {
     console.error("Firebase Admin Storage or Firestore is not configured. Check server logs.");
     return { success: false, message: "Server configuration error: Cannot delete. Admin should check server logs." };
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const file = bucket.file(filePathToDelete);
    
    console.log(`[deleteImageAction] Attempting to delete from Firebase Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePathToDelete}`);
    await file.delete();
    console.log(`[deleteImageAction] Successfully deleted from Firebase Storage: ${filePathToDelete}`);

    const docRef = doc(adminDb, "media_gallery", docId);
    await deleteDoc(docRef);
    console.log(`[deleteImageAction] Successfully deleted Firestore document: ${docId}`);
    
    return { success: true, message: "Image deleted successfully from Firebase Storage and database." };
  } catch (error: any) {
    console.error("Error deleting image:", error);
    // Check if the error is "object not found" which means it might already be deleted or path is wrong
    if (error.code === 404 || (error.errors && error.errors.some((e: any) => e.reason === 'notFound'))) {
        console.warn(`[deleteImageAction] File not found in Firebase Storage (${filePathToDelete}), attempting to delete Firestore record only.`);
        try {
            const docRef = doc(adminDb, "media_gallery", docId);
            await deleteDoc(docRef);
            return { success: true, message: "Image not found in Storage (possibly already deleted), but database record removed." };
        } catch (dbError) {
            console.error("Error deleting Firestore document after storage file not found:", dbError);
            return { success: false, message: "File not found in Storage, and also failed to delete database record." };
        }
    }
    return { success: false, message: "Failed to delete image. It might still exist. Check server logs." };
  }
}

export async function incrementDownloadCountAction(docId: string): Promise<{ success: boolean; message?: string }> {
  if (!adminDb) {
    console.error("[incrementDownloadCountAction] Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error." };
  }
  if (!docId) {
    return { success: false, message: "Document ID is required to increment download count." };
  }
  try {
    const docRef = doc(adminDb, "media_gallery", docId);
    await updateDoc(docRef, {
      downloadCount: increment(1)
    });
    return { success: true, message: "Download count incremented." };
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return { success: false, message: "Failed to increment download count." };
  }
}
