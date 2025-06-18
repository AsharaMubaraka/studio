
"use server";

import { z } from "zod";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import admin from 'firebase-admin'; // For Timestamp
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const imageMetadataSchema = z.object({
  name: z.string().min(3, "Image name must be at least 3 characters.").max(100),
  description: z.string().max(500, "Description can be up to 500 characters.").optional(),
});

export interface PublicImage {
  id: string;
  name: string;
  description?: string;
  imageUrl: string; // Public URL from Firebase Storage
  uploadedAt: Date;
  originalFileName?: string;
  // downloadCount will not be directly exposed to public to avoid simple manipulation
}

export interface AdminImageInfo extends PublicImage {
  downloadCount: number;
  uploaderName?: string;
  storagePath: string; // Needed for deletion
}

export async function fetchPublicImagesAction(): Promise<PublicImage[]> {
  if (!adminDb) {
    console.error("fetchPublicImagesAction: Firestore admin instance not available.");
    return [];
  }
  try {
    const snapshot = await adminDb.collection("media_gallery").orderBy("uploadedAt", "desc").get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        uploadedAt: (data.uploadedAt as admin.firestore.Timestamp).toDate(),
        originalFileName: data.originalFileName,
      };
    });
  } catch (error) {
    console.error("Error fetching public images:", error);
    return [];
  }
}

export async function fetchAdminImageInfosAction(): Promise<AdminImageInfo[]> {
   if (!adminDb) {
    console.error("fetchAdminImageInfosAction: Firestore admin instance not available.");
    return [];
  }
  try {
    const snapshot = await adminDb.collection("media_gallery").orderBy("uploadedAt", "desc").get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        uploadedAt: (data.uploadedAt as admin.firestore.Timestamp).toDate(),
        downloadCount: data.downloadCount || 0,
        uploaderName: data.uploaderName || "Unknown",
        storagePath: data.storagePath,
        originalFileName: data.originalFileName,
      };
    });
  } catch (error) {
    console.error("Error fetching admin image infos:", error);
    return [];
  }
}

export async function uploadImageAndSaveMetadataAction(
  formData: FormData,
  uploader: { id: string; name?: string }
): Promise<{ success: boolean; message: string; error?: any; imageId?: string }> {
  if (!adminStorage || !adminDb) {
    return { success: false, message: "Firebase Admin SDK not initialized. Cannot upload image." };
  }

  const file = formData.get("imageFile") as File | null;
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;

  if (!file) {
    return { success: false, message: "No image file provided." };
  }
  if (!name) {
    return { success: false, message: "Image name is required." };
  }

  try {
    imageMetadataSchema.parse({ name, description: description || undefined });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", error: error.flatten().fieldErrors };
    }
    return { success: false, message: "Invalid metadata.", error };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, message: `File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.` };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}.` };
  }

  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${randomUUID()}.${fileExtension}`;
  const storagePath = `media_gallery/${uniqueFileName}`;
  
  try {
    const bucket = adminStorage.bucket();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await bucket.file(storagePath).save(fileBuffer, {
      metadata: { contentType: file.type },
      public: true, // Make it public by default for simpler gallery display
    });
    
    // Construct the public URL. This format is standard for Firebase Storage.
    // Ensure your bucket is configured for public access if using this URL structure directly.
    // Otherwise, you might need getSignedUrl for temporary access. For a public gallery, public is simpler.
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    const imageDocRef = adminDb.collection("media_gallery").doc();
    await imageDocRef.set({
      name,
      description: description || null,
      imageUrl,
      storagePath, // Store the path for deletion
      originalFileName: file.name,
      contentType: file.type,
      uploaderUid: uploader.id,
      uploaderName: uploader.name || "Admin",
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      downloadCount: 0,
    });

    return { success: true, message: "Image uploaded successfully!", imageId: imageDocRef.id };
  } catch (error: any) {
    console.error("Error uploading image or saving metadata:", error);
    // Attempt to delete orphaned file from storage if DB write failed after successful upload
    if (storagePath && error.message.includes("metadata")) { // Crude check, improve if needed
        try {
            await adminStorage.bucket().file(storagePath).delete();
            console.log("Orphaned file deleted from storage:", storagePath);
        } catch (deleteError) {
            console.error("Failed to delete orphaned file from storage:", deleteError);
        }
    }
    return { success: false, message: `Upload failed: ${error.message}`, error };
  }
}

export async function incrementDownloadCountAction(imageId: string): Promise<{ success: boolean }> {
  if (!adminDb) {
    return { success: false };
  }
  try {
    const imageRef = adminDb.collection("media_gallery").doc(imageId);
    await imageRef.update({
      downloadCount: admin.firestore.FieldValue.increment(1)
    });
    return { success: true };
  } catch (error) {
    console.error("Error incrementing download count for image ID", imageId, ":", error);
    return { success: false };
  }
}

export async function deleteImageAction(imageId: string, storagePath: string): Promise<{ success: boolean; message: string }> {
  if (!adminStorage || !adminDb) {
    return { success: false, message: "Firebase Admin SDK not initialized. Cannot delete image." };
  }

  if (!imageId || !storagePath) {
    return { success: false, message: "Image ID or storage path missing." };
  }

  try {
    // Delete from Firestore
    await adminDb.collection("media_gallery").doc(imageId).delete();

    // Delete from Firebase Storage
    const bucket = adminStorage.bucket();
    await bucket.file(storagePath).delete();

    return { success: true, message: "Image deleted successfully." };
  } catch (error: any) {
    console.error("Error deleting image:", error);
    // If Firestore delete succeeded but Storage failed, data is inconsistent.
    // More sophisticated error handling/retry might be needed in a production app.
    return { success: false, message: `Deletion failed: ${error.message}` };
  }
}

