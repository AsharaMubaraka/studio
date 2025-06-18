
"use server";

import { z } from "zod";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { collection, getDocs, doc, deleteDoc, query, Timestamp, updateDoc, increment, setDoc, FieldValue, getDoc as getFirestoreDoc } from "firebase/firestore"; // Added getDoc as getFirestoreDoc
import { getDownloadURL } from "firebase-admin/storage"; // list is not used

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

const mediaFormSchemaServer = z.object({ // Server-side schema, title/desc only
    title: z.string().min(1, "Title is required.").max(100), // Min 1 for console uploads where filename is title initially
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
  uploaderId?: string; // Optional as console uploads won't have this initially
  uploaderName?: string; // Optional
  createdAt: Date; // Will be file creation time for console uploads if available, or fetch time
  downloadCount: number;
}

// Action to upload an image AND create its metadata in Firestore
export async function uploadImageAction(formData: FormData, author: {id: string; name?: string}) {
  console.log("[uploadImageAction] Action started.");
  
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

    if (!adminStorage) {
        console.error("[uploadImageAction] Firebase Admin Storage is not initialized.");
        return { success: false, message: "Server configuration error: Firebase Admin Storage not available." };
    }
    
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

    // The makePublic call is important if default bucket ACLs are not public-read
    // await fileUpload.makePublic(); // This is implicitly handled by `public: true` in createWriteStream in GCS, but explicit for safety/other providers.
    // For GCS, download URL is generated without explicit makePublic if object ACL allows or signed URL is used.
    // getDownloadURL should work if `public: true` was effective or if using default service account with sufficient permissions.
    const publicUrl = await getDownloadURL(fileUpload);
    console.log(`[uploadImageAction] Public URL: ${publicUrl}`);

    if (!adminDb) {
      console.error("[uploadImageAction] Firebase Admin Firestore (adminDb) is not initialized.");
      return { success: false, message: "Server configuration error: Firestore not available." };
    }

    const docId = sanitizeFilePathForDocId(filePath);
    await setDoc(doc(adminDb, "media_gallery", docId), {
      title,
      description: descriptionForZod || FieldValue.delete(), // Store undefined as delete for cleaner Firestore
      imageUrl: publicUrl,
      filePath: filePath, // Store the full path
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
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
  console.log(`[getGalleryImagesAction] Called. Admin view: ${adminView}`);
  if (!adminStorage || !adminDb) {
    console.error("[getGalleryImagesAction] Firebase Admin Storage or Firestore is not initialized.");
    return [];
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const [storageFiles] = await bucket.getFiles({ prefix: "media_gallery/" });
    console.log(`[getGalleryImagesAction] Found ${storageFiles.length} files in Storage with prefix 'media_gallery/'.`);
    
    const firestoreDocsSnap = await getDocs(query(collection(adminDb, "media_gallery")));
    const firestoreDataMap = new Map<string, DocumentData>();
    firestoreDocsSnap.forEach(docSnap => {
      // Key by filePath for easy lookup
      firestoreDataMap.set(docSnap.data().filePath, { id: docSnap.id, ...docSnap.data() });
    });
    console.log(`[getGalleryImagesAction] Fetched ${firestoreDataMap.size} metadata documents from Firestore.`);

    const mediaItemsPromises = storageFiles
      .filter(file => !file.name.endsWith('/')) // Exclude folder objects
      .map(async (file): Promise<MediaItem | null> => {
        const filePath = file.name; // e.g., "media_gallery/image.jpg"
        try {
          // Attempt to make the file public; crucial if not set by default or by upload process
          // This might fail if the service account doesn't have Storage Object Admin role.
          // However, getDownloadURL might still work if default object ACLs are public-read
          // or if the service account has permission to generate signed URLs (which getDownloadURL might do).
          // For a bucket set to "public:true" on upload, this makePublic call might be redundant but harmless.
          try {
            await file.makePublic();
          } catch (makePublicError) {
             console.warn(`[getGalleryImagesAction] Could not make file ${filePath} public. It might already be public, or permissions are insufficient. Error: ${makePublicError}`);
          }
          
          const [publicUrl, metadata] = await Promise.all([
             getDownloadURL(file), // This generates a long-lived tokenized URL
             file.getMetadata().then(res => res[0]) // Get file metadata for creation time
          ]);

          const firestoreDoc = firestoreDataMap.get(filePath);
          const docId = firestoreDoc?.id || sanitizeFilePathForDocId(filePath);
          
          // Generate default title from filename if not in Firestore
          let titleFromFile = filePath.substring(filePath.lastIndexOf('/') + 1);
          const lastDotIndex = titleFromFile.lastIndexOf('.');
          if (lastDotIndex > 0) {
            titleFromFile = titleFromFile.substring(0, lastDotIndex); // Remove extension
          }
          // Remove numeric prefix like "1_" or "123_" for a cleaner default
          titleFromFile = titleFromFile.replace(/^\d+_/, ''); 
          // Then remove any remaining long timestamp prefix if that was the original format.
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
        } catch (fileError) {
          console.error(`[getGalleryImagesAction] Error processing file ${filePath}:`, fileError);
          return null; // Skip files that cause errors
        }
      });
      
    const resolvedMediaItems = (await Promise.all(mediaItemsPromises)).filter(item => item !== null) as MediaItem[];
    console.log(`[getGalleryImagesAction] Successfully processed ${resolvedMediaItems.length} media items.`);
    
    // Sort by createdAt date, newest first
    resolvedMediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return resolvedMediaItems;

  } catch (error) {
    console.error("[getGalleryImagesAction] Error fetching gallery images:", error);
    return [];
  }
}


export async function updateImageMetadataAction(
  data: { filePath: string; imageUrl: string; title: string; description?: string; },
  author: { id: string; name?: string }
): Promise<{ success: boolean; message: string; updatedItem?: MediaItem }> {
  console.log(`[updateImageMetadataAction] Called for filePath: ${data.filePath}`);
  if (!adminDb) {
    console.error("[updateImageMetadataAction] Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error: Firestore not available." };
  }
  try {
    const { filePath, imageUrl, title, description } = data;
    if (!title || title.trim() === "") {
      return { success: false, message: "Title cannot be empty." };
    }

    const docId = sanitizeFilePathForDocId(filePath);
    const docRef = doc(adminDb, "media_gallery", docId);
    
    const currentDocSnap = await getFirestoreDoc(docRef); // Use aliased getDoc
    let finalCreatedAt: FieldValue | Date;
    let finalUploaderId = author.id;
    let finalUploaderName = author.name || "Admin";
    let existingDownloadCount = 0;

    if (currentDocSnap.exists()) {
      const existingData = currentDocSnap.data();
      console.log(`[updateImageMetadataAction] Document ${docId} exists. Preserving original metadata where applicable.`);
      finalCreatedAt = existingData.createdAt || serverTimestamp(); 
      finalUploaderId = existingData.uploaderId || author.id; // Keep original uploader if exists
      finalUploaderName = existingData.uploaderName || author.name || "Admin"; // Keep original uploader name
      existingDownloadCount = existingData.downloadCount || 0;
    } else {
      console.log(`[updateImageMetadataAction] Document ${docId} does not exist. Creating new metadata record (likely for console upload).`);
      finalCreatedAt = serverTimestamp(); 
      // uploaderId and uploaderName will be the current admin editing it
    }
    
    const metadataToSave = {
      title: title.trim(),
      description: description && description.trim() !== "" ? description.trim() : FieldValue.delete(),
      filePath: filePath, // Ensure filePath is always saved
      imageUrl: imageUrl, // Ensure imageUrl is always saved/updated
      uploaderId: finalUploaderId,
      uploaderName: finalUploaderName,
      createdAt: finalCreatedAt,
      downloadCount: existingDownloadCount, // Preserve existing download count
      updatedAt: serverTimestamp() // Always set/update this
    };

    await setDoc(docRef, metadataToSave, { merge: true }); // Merge ensures other fields (like downloadCount if not explicitly set here) are preserved if document existed.
    console.log(`[updateImageMetadataAction] Metadata for ${docId} saved successfully.`);
    
    const updatedDocSnap = await getFirestoreDoc(docRef); // Re-fetch to get server-generated timestamps
    const savedData = updatedDocSnap.data();

    if (!savedData) { // Should not happen if setDoc was successful
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
        createdAt: (savedData.createdAt as Timestamp).toDate(), // serverTimestamp converts to Timestamp
        downloadCount: savedData.downloadCount || 0,
    };

    return { success: true, message: "Image metadata updated successfully.", updatedItem };

  } catch (error: any) {
    console.error("[updateImageMetadataAction] Error updating image metadata:", error);
    return { success: false, message: error.message || "Failed to update image metadata." };
  }
}


// Action to delete an image from Storage and its metadata from Firestore
export async function deleteImageAction(filePathToDelete: string, docId: string) {
  console.log(`[deleteImageAction] Called for filePath: ${filePathToDelete}, docId: ${docId}`);
  if (!adminStorage || !adminDb) {
     console.error("[deleteImageAction] Firebase Admin Storage or Firestore is not configured.");
     return { success: false, message: "Server configuration error." };
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const file = bucket.file(filePathToDelete); // filePathToDelete is the full path e.g. "media_gallery/image.jpg"
    
    console.log(`[deleteImageAction] Attempting to delete from Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePathToDelete}`);
    await file.delete();
    console.log(`[deleteImageAction] Successfully deleted from Storage: ${filePathToDelete}`);

    const firestoreDocIdToDelete = docId || sanitizeFilePathForDocId(filePathToDelete);
    const docRef = doc(adminDb, "media_gallery", firestoreDocIdToDelete);
    await deleteDoc(docRef);
    console.log(`[deleteImageAction] Successfully deleted Firestore document: ${firestoreDocIdToDelete}`);
    
    return { success: true, message: "Image deleted successfully." };
  } catch (error: any) {
    console.error(`[deleteImageAction] Error during deletion for ${filePathToDelete}:`, error);
    // Handle case where file might not exist in Storage (e.g., already deleted, or error in path)
    // Firebase Storage delete error for not found is often code 404 or specific message
    if (error.code === 404 || (error.errors && error.errors.some((e: any) => e.reason === 'notFound'))) {
        console.warn(`[deleteImageAction] File not found in Storage (${filePathToDelete}), attempting to delete Firestore record.`);
        try {
            const firestoreDocIdToDelete = docId || sanitizeFilePathForDocId(filePathToDelete);
            const docRef = doc(adminDb, "media_gallery", firestoreDocIdToDelete);
            await deleteDoc(docRef); // Attempt to delete Firestore doc anyway
            console.log(`[deleteImageAction] Firestore document ${firestoreDocIdToDelete} deleted after Storage file not found.`);
            return { success: true, message: "Image not found in Storage, but database record removed if it existed." };
        } catch (dbError: any) {
            console.error(`[deleteImageAction] File not found in Storage, AND failed to delete Firestore record ${docId}:`, dbError);
            return { success: false, message: "File not found in Storage, and failed to delete database record. " + dbError.message };
        }
    }
    return { success: false, message: "Failed to delete image. " + error.message };
  }
}


export async function incrementDownloadCountAction(docIdToUpdate: string): Promise<{ success: boolean; message?: string }> {
  console.log(`[incrementDownloadCountAction] Called for docId: ${docIdToUpdate}`);
  if (!adminDb) {
    console.error("[incrementDownloadCountAction] Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error." };
  }
  if (!docIdToUpdate || docIdToUpdate.trim() === "") { // Check if docId is empty or just whitespace
    console.error("[incrementDownloadCountAction] Document ID is required and cannot be empty.");
    return { success: false, message: "Document ID is required." };
  }
  try {
    const docRef = doc(adminDb, "media_gallery", docIdToUpdate);
    
    // Check if doc exists before incrementing. If not, it means this image might only exist in storage.
    // In such a case, we can't increment a non-existent field.
    // However, if metadata is saved on first edit, this doc should exist for subsequent downloads.
    const docSnap = await getFirestoreDoc(docRef);
    if (!docSnap.exists()) {
        console.warn(`[incrementDownloadCountAction] Document ${docIdToUpdate} does not exist. Cannot increment count. This might be a console-uploaded image not yet edited.`);
        // Optionally, create the doc with count 1 here if desired, but this action is for incrementing.
        // For now, just return success=false or a specific message.
        return { success: false, message: "Metadata record not found for this image. Download count not updated."};
    }

    await updateDoc(docRef, {
      downloadCount: increment(1)
    });
    console.log(`[incrementDownloadCountAction] Download count for ${docIdToUpdate} incremented successfully.`);
    return { success: true, message: "Download count incremented." };
  } catch (error: any) {
    console.error(`[incrementDownloadCountAction] Error incrementing download count for ${docIdToUpdate}:`, error);
    return { success: false, message: "Failed to increment download count. " + error.message };
  }
}
    

    