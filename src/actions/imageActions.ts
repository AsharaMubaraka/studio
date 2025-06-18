
"use server";

import { z } from "zod";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin"; // Firebase Admin SDK
import { getDownloadURL } from "firebase-admin/storage";
import { Timestamp, FieldValue } from "firebase-admin/firestore"; // Firebase Admin Firestore types
import type { DocumentData } from "firebase-admin/firestore";

const TARGET_STORAGE_BUCKET_NAME = "lnv-fmb.appspot.com"; // Your target bucket

// Helper to sanitize filePath for use as a Firestore document ID
const sanitizeFilePathForDocId = (filePath: string): string => {
  return filePath.replace(/\//g, "_").replace(/[^a-zA-Z0-9_.-]/g, '');
};

const mediaFormSchemaClient = z.object({ // Client-side schema, expects File
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File, { message: "Image file is required." })
          .refine(file => file.size <= 25 * 1024 * 1024, "Max file size is 25MB.")
          .refine(file => file.type.startsWith("image/"), "Only image files are accepted."),
});

// Server-side schema for validating title/description when saving metadata
const mediaFormSchemaServer = z.object({ 
    title: z.string().min(1, "Title is required.").max(100),
    description: z.string().max(500).optional(),
});


export type MediaFormValuesClient = z.infer<typeof mediaFormSchemaClient>;
export type MediaFormValuesServer = z.infer<typeof mediaFormSchemaServer>;


export interface MediaItem {
  id: string; // Firestore document ID (can be derived from filePath for console uploads)
  title: string;
  description?: string;
  imageUrl: string;
  filePath: string; // Full path in Firebase Storage, e.g., "media_gallery/image.jpg"
  uploaderId?: string; 
  uploaderName?: string; 
  createdAt: Date; 
  downloadCount: number;
}

// Action to upload an image AND create its metadata in Firestore
export async function uploadImageAction(formData: FormData, author: {id: string; name?: string}) {
  console.log("[uploadImageAction] Action started.");

  if (!adminStorage || !adminDb) {
    console.error("[uploadImageAction] CRITICAL: Firebase Admin Storage or Firestore is not initialized. Check server logs for firebaseAdmin.ts issues.");
    return { success: false, message: "Server configuration error: Firebase Admin SDK not available." };
  }
  
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const rawFile = formData.get("file");

  const title = typeof rawTitle === 'string' && rawTitle.trim() !== "" && rawTitle.trim().toLowerCase() !== "null" ? rawTitle.trim() : "";
  const descriptionForZod = typeof rawDescription === 'string' && rawDescription.trim().toLowerCase() !== "null" ? rawDescription.trim() : undefined;
  const file = rawFile instanceof File ? rawFile : null;

  console.log(`[uploadImageAction] Extracted - Title: '${title}', Description: '${descriptionForZod}', File present: ${!!file}`);

  try {
    console.log(`[uploadImageAction] Validating with Zod server schema: title='${title}', description='${descriptionForZod}'`);
    mediaFormSchemaServer.parse({ title, description: descriptionForZod });
    
    if (!file) {
      console.error("[uploadImageAction] File validation failed: No file provided.");
      return { success: false, message: "No file provided. Ensure a file is selected." };
    }
    if (file.size > 25 * 1024 * 1024) { // 25MB limit
        console.error(`[uploadImageAction] File validation failed: File too large. Size: ${file.size}`);
        return { success: false, message: "File is too large. Max 25MB allowed." };
    }
    if (!file.type.startsWith("image/")) {
        console.error(`[uploadImageAction] File validation failed: Invalid file type. Type: ${file.type}`);
        return { success: false, message: "Invalid file type. Only images are allowed." };
    }
    console.log(`[uploadImageAction] File details - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = Date.now();
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
    const filePath = `media_gallery/${timestamp}_${originalFileName}`;

    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const fileUpload = bucket.file(filePath);

    console.log(`[uploadImageAction] Uploading to Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePath}`);
    const stream = fileUpload.createWriteStream({ metadata: { contentType: file.type }, public: true });
    
    await new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        console.error("[uploadImageAction] Storage upload stream error:", err);
        reject(err);
      });
      stream.on('finish', resolve);
      stream.end(buffer);
    });
    console.log("[uploadImageAction] File uploaded to Storage successfully.");

    // The makePublic call helps ensure the object ACL is public-read.
    // getDownloadURL for firebase-admin typically generates a signed URL regardless of ACLs,
    // but having it public allows direct access too if needed.
    // await fileUpload.makePublic(); // This is implicitly handled by `public: true` in createWriteStream in GCS

    const publicUrl = await getDownloadURL(fileUpload);
    console.log(`[uploadImageAction] Public URL: ${publicUrl}`);

    const docId = sanitizeFilePathForDocId(filePath);
    await adminDb.collection("media_gallery").doc(docId).set({
      title,
      description: descriptionForZod || FieldValue.delete(), 
      imageUrl: publicUrl,
      filePath: filePath, 
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: FieldValue.serverTimestamp(), // Admin SDK server timestamp
      downloadCount: 0,
    });
    console.log("[uploadImageAction] Successfully saved metadata to Firestore.");
    return { success: true, message: "Image uploaded and metadata saved successfully!" };

  } catch (error: any) {
    console.error("[uploadImageAction] Error during image upload process:", error);
    const errorMessage = error.message || "An unknown error occurred during image upload.";
    if (error instanceof z.ZodError) return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    return { success: false, message: errorMessage };
  }
}

// Action to get all gallery images, sourcing from Storage and merging with Firestore
export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  console.log(`[getGalleryImagesAction] Called. Admin view: ${adminView}. Target Bucket: ${TARGET_STORAGE_BUCKET_NAME}`);
  if (!adminStorage || !adminDb) {
    console.error("[getGalleryImagesAction] CRITICAL: Firebase Admin Storage or Firestore is not initialized.");
    return [];
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const [storageFiles] = await bucket.getFiles({ prefix: "media_gallery/" });
    console.log(`[getGalleryImagesAction] Found ${storageFiles.length} files in Storage with prefix 'media_gallery/'.`);
    
    if (storageFiles.length === 0) {
        console.log("[getGalleryImagesAction] No files found in storage at specified prefix. Returning empty list.");
        return [];
    }

    const firestoreCollectionRef = adminDb.collection("media_gallery");
    const firestoreDocsSnap = await firestoreCollectionRef.get();
    const firestoreDataMap = new Map<string, DocumentData>();
    firestoreDocsSnap.forEach(docSnap => {
      firestoreDataMap.set(docSnap.data().filePath, { id: docSnap.id, ...docSnap.data() });
    });
    console.log(`[getGalleryImagesAction] Fetched ${firestoreDataMap.size} metadata documents from Firestore.`);

    const mediaItemsPromises = storageFiles
      .filter(file => !file.name.endsWith('/')) // Exclude folder objects
      .map(async (file): Promise<MediaItem | null> => {
        const filePath = file.name; // e.g., "media_gallery/image.jpg"
        console.log(`[getGalleryImagesAction] Processing file: ${filePath}`);
        try {
          try {
            await file.makePublic(); // Ensure public readability for direct URL access
            console.log(`[getGalleryImagesAction] Made file public (or already was): ${filePath}`);
          } catch (makePublicError: any) {
             console.warn(`[getGalleryImagesAction] Could not make file ${filePath} public. Error: ${makePublicError.message}. Download URL generation should still work via service account.`);
          }
          
          const [publicUrl, metadata] = await Promise.all([
             getDownloadURL(file),
             file.getMetadata().then(res => res[0])
          ]);
          console.log(`[getGalleryImagesAction] Got URL and metadata for: ${filePath}`);

          const firestoreDoc = firestoreDataMap.get(filePath);
          const docId = firestoreDoc?.id || sanitizeFilePathForDocId(filePath);
          
          let titleFromFile = filePath.substring(filePath.lastIndexOf('/') + 1);
          const lastDotIndex = titleFromFile.lastIndexOf('.');
          if (lastDotIndex > 0) titleFromFile = titleFromFile.substring(0, lastDotIndex);
          titleFromFile = titleFromFile.replace(/^\d+_/, ''); 
          titleFromFile = titleFromFile.replace(/^\d{10,15}_/, ''); 

          return {
            id: docId,
            title: firestoreDoc?.title || titleFromFile,
            description: firestoreDoc?.description,
            imageUrl: publicUrl,
            filePath: filePath,
            uploaderId: firestoreDoc?.uploaderId,
            uploaderName: firestoreDoc?.uploaderName,
            createdAt: firestoreDoc?.createdAt ? (firestoreDoc.createdAt as Timestamp).toDate() : (metadata.timeCreated ? new Date(metadata.timeCreated) : new Date()),
            downloadCount: firestoreDoc?.downloadCount || 0,
          };
        } catch (fileError: any) {
          console.error(`[getGalleryImagesAction] Error processing file ${filePath}:`, fileError.message, fileError.stack);
          return null; 
        }
      });
      
    const resolvedMediaItems = (await Promise.all(mediaItemsPromises)).filter(item => item !== null) as MediaItem[];
    console.log(`[getGalleryImagesAction] Successfully processed ${resolvedMediaItems.length} media items.`);
    
    resolvedMediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return resolvedMediaItems;

  } catch (error: any) {
    console.error("[getGalleryImagesAction] Error fetching gallery images:", error.message, error.stack);
    return [];
  }
}


export async function updateImageMetadataAction(
  data: { filePath: string; imageUrl: string; title: string; description?: string; },
  author: { id: string; name?: string }
): Promise<{ success: boolean; message: string; updatedItem?: MediaItem }> {
  console.log(`[updateImageMetadataAction] Called for filePath: ${data.filePath}`);
  if (!adminDb) {
    console.error("[updateImageMetadataAction] CRITICAL: Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error: Firestore not available." };
  }
  try {
    const { filePath, imageUrl, title, description } = data;
    // Basic server-side validation for title (as client should handle more complex cases)
    if (!title || title.trim() === "") {
      return { success: false, message: "Title cannot be empty." };
    }

    const docId = sanitizeFilePathForDocId(filePath);
    const docRef = adminDb.collection("media_gallery").doc(docId);
    
    const currentDocSnap = await docRef.get();
    let finalCreatedAt: Timestamp | FieldValue = FieldValue.serverTimestamp(); // Default to now if new
    let finalUploaderId = author.id;
    let finalUploaderName = author.name || "Admin";
    let existingDownloadCount = 0;

    if (currentDocSnap.exists) {
      const existingData = currentDocSnap.data() as DocumentData;
      console.log(`[updateImageMetadataAction] Document ${docId} exists. Preserving original metadata where applicable.`);
      finalCreatedAt = existingData.createdAt || FieldValue.serverTimestamp(); 
      finalUploaderId = existingData.uploaderId || author.id;
      finalUploaderName = existingData.uploaderName || author.name || "Admin";
      existingDownloadCount = existingData.downloadCount || 0;
    } else {
      console.log(`[updateImageMetadataAction] Document ${docId} does not exist. Creating new metadata record.`);
      // uploaderId, uploaderName, createdAt will be set for the new doc
    }
    
    const metadataToSave: any = { // Using any for partial updates with FieldValue.delete()
      title: title.trim(),
      description: description && description.trim() !== "" ? description.trim() : FieldValue.delete(),
      filePath: filePath, 
      imageUrl: imageUrl, 
      uploaderId: finalUploaderId,
      uploaderName: finalUploaderName,
      createdAt: finalCreatedAt, // Persist or set new
      downloadCount: existingDownloadCount, // Preserve existing download count
      updatedAt: FieldValue.serverTimestamp() 
    };

    // Remove undefined fields to avoid issues with Firestore
    Object.keys(metadataToSave).forEach(key => metadataToSave[key] === undefined && delete metadataToSave[key]);

    await docRef.set(metadataToSave, { merge: true }); // Merge ensures other fields are preserved if document existed.
    console.log(`[updateImageMetadataAction] Metadata for ${docId} saved successfully.`);
    
    const updatedDocSnap = await docRef.get();
    const savedData = updatedDocSnap.data();

    if (!savedData) { 
        console.error(`[updateImageMetadataAction] Firestore document ${docId} not found after saving.`);
        return { success: false, message: "Failed to retrieve updated metadata from Firestore." };
    }

    const updatedItem: MediaItem = {
        id: updatedDocSnap.id,
        title: savedData.title,
        description: savedData.description,
        imageUrl: savedData.imageUrl,
        filePath: savedData.filePath,
        uploaderId: savedData.uploaderId,
        uploaderName: savedData.uploaderName,
        createdAt: (savedData.createdAt as Timestamp).toDate(), 
        downloadCount: savedData.downloadCount || 0,
    };

    return { success: true, message: "Image metadata updated successfully.", updatedItem };

  } catch (error: any) {
    console.error("[updateImageMetadataAction] Error updating image metadata:", error.message, error.stack);
    return { success: false, message: error.message || "Failed to update image metadata." };
  }
}


export async function deleteImageAction(filePathToDelete: string, docId: string) {
  console.log(`[deleteImageAction] Called for filePath: ${filePathToDelete}, docId: ${docId}`);
  if (!adminStorage || !adminDb) {
     console.error("[deleteImageAction] CRITICAL: Firebase Admin Storage or Firestore is not configured.");
     return { success: false, message: "Server configuration error." };
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const file = bucket.file(filePathToDelete); 
    
    console.log(`[deleteImageAction] Attempting to delete from Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePathToDelete}`);
    try {
        await file.delete();
        console.log(`[deleteImageAction] Successfully deleted from Storage: ${filePathToDelete}`);
    } catch (storageError: any) {
        if (storageError.code === 404) { // GCS not found error code
            console.warn(`[deleteImageAction] File not found in Storage (${filePathToDelete}), proceeding to delete Firestore record.`);
        } else {
            throw storageError; // Re-throw other storage errors
        }
    }

    const firestoreDocIdToDelete = docId || sanitizeFilePathForDocId(filePathToDelete);
    const docRef = adminDb.collection("media_gallery").doc(firestoreDocIdToDelete);
    await docRef.delete();
    console.log(`[deleteImageAction] Successfully deleted Firestore document: ${firestoreDocIdToDelete}`);
    
    return { success: true, message: "Image deleted successfully (or was already removed from storage)." };
  } catch (error: any) {
    console.error(`[deleteImageAction] Error during deletion for ${filePathToDelete}:`, error.message, error.stack);
    return { success: false, message: "Failed to delete image. " + error.message };
  }
}


export async function incrementDownloadCountAction(docIdToUpdate: string): Promise<{ success: boolean; message?: string }> {
  console.log(`[incrementDownloadCountAction] Called for docId: ${docIdToUpdate}`);
  if (!adminDb) {
    console.error("[incrementDownloadCountAction] CRITICAL: Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error." };
  }
  if (!docIdToUpdate || docIdToUpdate.trim() === "") { 
    console.error("[incrementDownloadCountAction] Document ID is required and cannot be empty.");
    return { success: false, message: "Document ID is required." };
  }
  try {
    const docRef = adminDb.collection("media_gallery").doc(docIdToUpdate);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        console.warn(`[incrementDownloadCountAction] Document ${docIdToUpdate} does not exist. Cannot increment count. This might be a console-uploaded image not yet edited or an ID mismatch.`);
        return { success: false, message: "Metadata record not found for this image. Download count not updated."};
    }

    await docRef.update({
      downloadCount: FieldValue.increment(1) // Admin SDK increment
    });
    console.log(`[incrementDownloadCountAction] Download count for ${docIdToUpdate} incremented successfully.`);
    return { success: true, message: "Download count incremented." };
  } catch (error: any) {
    console.error(`[incrementDownloadCountAction] Error incrementing download count for ${docIdToUpdate}:`, error.message, error.stack);
    return { success: false, message: "Failed to increment download count. " + error.message };
  }
}
