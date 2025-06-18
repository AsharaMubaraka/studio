
"use server";

import { z } from "zod";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, where, Timestamp, updateDoc, increment, setDoc, FieldValue } from "firebase/firestore";
import { getDownloadURL, list } from "firebase-admin/storage";
import { Readable } from "stream";

const TARGET_STORAGE_BUCKET_NAME = "lnv-fmb.appspot.com"; // Your target bucket

// Helper to sanitize filePath for use as a Firestore document ID
const sanitizeFilePathForDocId = (filePath: string): string => {
  return filePath.replace(/\//g, "_").replace(/[^a-zA-Z0-9_.-]/g, '');
};

const mediaFormSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100), // Min 1 for console uploads where filename is title
  description: z.string().max(500).optional(),
});

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export interface MediaItem {
  id: string; // Firestore document ID (can be derived from filePath for console uploads)
  title: string;
  description?: string;
  imageUrl: string;
  filePath: string;
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

  const title = typeof rawTitle === 'string' && rawTitle.trim() !== "null" ? rawTitle.trim() : "";
  const descriptionForZod = typeof rawDescription === 'string' && rawDescription.trim() !== "null" ? rawDescription.trim() : undefined;
  const file = rawFile instanceof File ? rawFile : null;

  try {
    console.log(`[uploadImageAction] Validating with Zod: title='${title}', description='${descriptionForZod}'`);
    mediaFormSchema.parse({ title, description: descriptionForZod });
    
    if (!file) {
      console.error("[uploadImageAction] File validation failed: No file provided.");
      throw new Error("No file provided. Ensure a file is selected.");
    }
    if (file.size > 25 * 1024 * 1024) {
        console.error(`[uploadImageAction] File validation failed: File too large. Size: ${file.size}`);
        throw new Error("File is too large. Max 25MB allowed.");
    }
    if (!file.type.startsWith("image/")) {
        console.error(`[uploadImageAction] File validation failed: Invalid file type. Type: ${file.type}`);
        throw new Error("Invalid file type. Only images are allowed.");
    }

    if (!adminStorage) {
        console.error("[uploadImageAction] Firebase Admin Storage is not initialized.");
        throw new Error("Server configuration error: Firebase Admin Storage not available.");
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = Date.now();
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `media_gallery/${timestamp}_${originalFileName}`;

    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const fileUpload = bucket.file(filePath);

    console.log(`[uploadImageAction] Uploading to Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePath}`);
    const stream = fileUpload.createWriteStream({ metadata: { contentType: file.type }, public: true });
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    const publicUrl = await getDownloadURL(fileUpload);
    console.log(`[uploadImageAction] Public URL: ${publicUrl}`);

    if (!adminDb) {
      console.error("[uploadImageAction] Firebase Admin Firestore (adminDb) is not initialized.");
      throw new Error("Server configuration error: Firestore not available.");
    }

    const docId = sanitizeFilePathForDocId(filePath);
    await setDoc(doc(adminDb, "media_gallery", docId), {
      title,
      description: descriptionForZod,
      imageUrl: publicUrl,
      filePath: filePath,
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
      downloadCount: 0,
    });
    console.log("[uploadImageAction] Successfully saved metadata to Firestore.");
    return { success: true, message: "Image uploaded and metadata saved successfully!" };

  } catch (error: any) {
    const errorMessage = error.message || "An unknown error occurred during image upload.";
    if (error instanceof z.ZodError) return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    return { success: false, message: errorMessage };
  }
}

// Action to get all gallery images, sourcing from Storage and merging with Firestore
export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  if (!adminStorage || !adminDb) {
    console.error("[getGalleryImagesAction] Firebase Admin Storage or Firestore is not initialized.");
    return [];
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const [storageFiles] = await bucket.getFiles({ prefix: "media_gallery/" });
    
    const firestoreDocsSnap = await getDocs(query(collection(adminDb, "media_gallery")));
    const firestoreDataMap = new Map<string, DocumentData>();
    firestoreDocsSnap.forEach(docSnap => {
      firestoreDataMap.set(docSnap.data().filePath, { id: docSnap.id, ...docSnap.data() });
    });

    const mediaItemsPromises = storageFiles
      .filter(file => !file.name.endsWith('/')) // Exclude folder objects
      .map(async (file): Promise<MediaItem | null> => {
        try {
          const filePath = file.name;
          // Ensure file is public if it isn't, though createWriteStream should handle this for new files.
          // For existing console-uploaded files, they might need to be made public manually or via a script.
          // For this action, we assume they are or will become public for getDownloadURL to work without error.
          await file.makePublic(); // Make sure file is public before getting URL
          const [publicUrl, metadata] = await Promise.all([
             getDownloadURL(file),
             file.getMetadata().then(res => res[0]) // Get file metadata for creation time
          ]);

          const firestoreDoc = firestoreDataMap.get(filePath);
          const docId = firestoreDoc?.id || sanitizeFilePathForDocId(filePath);
          
          let titleFromFile = filePath.substring(filePath.lastIndexOf('/') + 1);
          // Remove extension from title
          const lastDotIndex = titleFromFile.lastIndexOf('.');
          if (lastDotIndex > 0) {
            titleFromFile = titleFromFile.substring(0, lastDotIndex);
          }
          // Remove timestamp prefix if present (e.g., 162987612345_)
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
          console.error(`Error processing file ${file.name}:`, fileError);
          return null; // Skip files that cause errors (e.g., permission issues for getDownloadURL)
        }
      });
      
    const resolvedMediaItems = (await Promise.all(mediaItemsPromises)).filter(item => item !== null) as MediaItem[];
    
    // Sort by createdAt date, newest first
    resolvedMediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return resolvedMediaItems;

  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

// Action to update image metadata (title, description) in Firestore
export async function updateImageMetadataAction(
  data: { filePath: string; imageUrl: string; title: string; description?: string; },
  author: { id: string; name?: string }
): Promise<{ success: boolean; message: string; updatedItem?: MediaItem }> {
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
    
    const currentDocSnap = await docRef.get();
    let finalCreatedAt: FieldValue | Date;
    let finalUploaderId = author.id;
    let finalUploaderName = author.name || "Admin";

    if (currentDocSnap.exists()) {
      // Document exists, preserve original createdAt, uploaderId, uploaderName unless they are not set
      const existingData = currentDocSnap.data();
      finalCreatedAt = existingData.createdAt || serverTimestamp(); // Keep original if exists
      finalUploaderId = existingData.uploaderId || author.id;
      finalUploaderName = existingData.uploaderName || author.name || "Admin";
    } else {
      // Document does not exist (e.g. console upload being edited for the first time)
      finalCreatedAt = serverTimestamp();
    }
    
    const metadataToSave = {
      title: title.trim(),
      description: description ? description.trim() : FieldValue.delete(), // Remove if empty
      filePath: filePath,
      imageUrl: imageUrl,
      uploaderId: finalUploaderId,
      uploaderName: finalUploaderName,
      createdAt: finalCreatedAt, // This will be serverTimestamp if new, or preserved if existing
      downloadCount: currentDocSnap.exists() ? currentDocSnap.data().downloadCount || 0 : 0,
      updatedAt: serverTimestamp() // Always set/update this
    };

    await setDoc(docRef, metadataToSave, { merge: true });
    
    const updatedDocSnap = await getDoc(docRef); // Re-fetch to get server-generated timestamps
    const savedData = updatedDocSnap.data();

    const updatedItem: MediaItem = {
        id: updatedDocSnap.id,
        title: savedData!.title,
        description: savedData!.description,
        imageUrl: savedData!.imageUrl,
        filePath: savedData!.filePath,
        uploaderId: savedData!.uploaderId,
        uploaderName: savedData!.uploaderName,
        createdAt: (savedData!.createdAt as Timestamp).toDate(),
        downloadCount: savedData!.downloadCount || 0,
    };

    return { success: true, message: "Image metadata updated successfully.", updatedItem };

  } catch (error: any) {
    console.error("Error updating image metadata:", error);
    return { success: false, message: error.message || "Failed to update image metadata." };
  }
}

// Action to delete an image from Storage and its metadata from Firestore
export async function deleteImageAction(filePathToDelete: string, docId: string) {
  if (!adminStorage || !adminDb) {
     console.error("Firebase Admin Storage or Firestore is not configured.");
     return { success: false, message: "Server configuration error." };
  }
  try {
    const bucket = adminStorage.bucket(TARGET_STORAGE_BUCKET_NAME);
    const file = bucket.file(filePathToDelete);
    
    console.log(`[deleteImageAction] Deleting from Storage: gs://${TARGET_STORAGE_BUCKET_NAME}/${filePathToDelete}`);
    await file.delete();
    console.log(`[deleteImageAction] Deleted from Storage: ${filePathToDelete}`);

    const firestoreDocId = docId || sanitizeFilePathForDocId(filePathToDelete);
    const docRef = doc(adminDb, "media_gallery", firestoreDocId);
    await deleteDoc(docRef);
    console.log(`[deleteImageAction] Deleted Firestore document: ${firestoreDocId}`);
    
    return { success: true, message: "Image deleted successfully." };
  } catch (error: any) {
    if (error.code === 404 || (error.errors && error.errors.some((e: any) => e.reason === 'notFound'))) {
        console.warn(`[deleteImageAction] File not found in Storage (${filePathToDelete}), attempting to delete Firestore record.`);
        try {
            const firestoreDocId = docId || sanitizeFilePathForDocId(filePathToDelete);
            const docRef = doc(adminDb, "media_gallery", firestoreDocId);
            await deleteDoc(docRef);
            return { success: true, message: "Image not found in Storage, but database record removed." };
        } catch (dbError) {
            return { success: false, message: "File not found in Storage, and failed to delete database record." };
        }
    }
    return { success: false, message: "Failed to delete image. " + error.message };
  }
}

// Action to increment download count
export async function incrementDownloadCountAction(docIdToUpdate: string): Promise<{ success: boolean; message?: string }> {
  if (!adminDb) {
    console.error("[incrementDownloadCountAction] Firebase Admin Firestore (adminDb) is not initialized.");
    return { success: false, message: "Server configuration error." };
  }
  if (!docIdToUpdate) {
    return { success: false, message: "Document ID is required." };
  }
  try {
    const docRef = doc(adminDb, "media_gallery", docIdToUpdate);
    await updateDoc(docRef, {
      downloadCount: increment(1)
    });
    return { success: true, message: "Download count incremented." };
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return { success: false, message: "Failed to increment download count." };
  }
}

    