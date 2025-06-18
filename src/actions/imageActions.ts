
"use server";

import { z } from "zod";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  Timestamp,
  // FieldValue as ClientFieldValue // Not explicitly used, serverTimestamp and increment handle it
} from "firebase/firestore";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL as getStorageDownloadURL, 
  deleteObject,
  listAll,
  getMetadata as getStorageMetadata,
  type FirebaseStorage
} from "firebase/storage";
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";

// Primary Firestore DB (from ashara-mubaraka-app, initialized in firebase.ts)
import { db as primaryDbInstance } from "@/lib/firebase"; 

// Secondary Firebase configuration for Storage (lnv-fmb project)
const secondaryStorageFirebaseConfig = {
  apiKey: "AIzaSyBXtRwAXnxP2Zhi4a62qamgUSny4x_kNRQ",
  authDomain: "lnv-fmb.firebaseapp.com",
  projectId: "lnv-fmb",
  storageBucket: "lnv-fmb.appspot.com",
  messagingSenderId: "819680208785",
  appId: "1:819680208785:web:4e3fbe0d91fb4013fedc30"
};

const SECONDARY_STORAGE_APP_NAME = "FirebaseLnvFmbStorageAppForImageActions";
const MEDIA_GALLERY_FOLDER_PATH = "media_gallery";


function getSecondaryStorageApp(): FirebaseApp {
  const apps = getApps();
  const existingApp = apps.find(app => app.name === SECONDARY_STORAGE_APP_NAME);
  if (existingApp) {
    console.log(`[getSecondaryStorageApp_ClientSDK] Returning existing Firebase app: ${SECONDARY_STORAGE_APP_NAME}`);
    return existingApp;
  }
  console.log(`[getSecondaryStorageApp_ClientSDK] Initializing new Firebase app: ${SECONDARY_STORAGE_APP_NAME} with project ID: ${secondaryStorageFirebaseConfig.projectId}`);
  return initializeApp(secondaryStorageFirebaseConfig, SECONDARY_STORAGE_APP_NAME);
}

// Helper to sanitize filePath for use as a Firestore document ID
const sanitizeFilePathForDocId = (filePath: string): string => {
  return filePath.replace(/\//g, "_").replace(/[^a-zA-Z0-9_.-]/g, '');
};

const mediaFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File, { message: "Image file is required." })
          .refine(file => file.size <= 25 * 1024 * 1024, "Max file size is 25MB.")
          .refine(file => file.type.startsWith("image/"), "Only image files are accepted."),
});

const mediaFormSchemaServer = z.object({ 
    title: z.string().min(1, "Title is required.").max(100),
    description: z.string().max(500).optional(),
});

export type MediaFormValuesClient = z.infer<typeof mediaFormSchemaClient>;
export type MediaFormValuesServer = z.infer<typeof mediaFormSchemaServer>;

export interface MediaItem {
  id: string; 
  title: string;
  description?: string;
  imageUrl: string;
  filePath: string; 
  uploaderId?: string; 
  uploaderName?: string; 
  createdAt: Date; 
  downloadCount: number;
}

export async function uploadImageAction(formData: FormData, author: {id: string; name?: string}) {
  console.log("[uploadImageAction_ClientSDK] Action started.");

  const db = primaryDbInstance; 
  if (!db) {
    console.error("[uploadImageAction_ClientSDK] CRITICAL: Primary Firestore DB not available from import.");
    return { success: false, message: "Server configuration error: Primary Firestore DB not initialized." };
  }
  
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const rawFile = formData.get("file");

  const title = typeof rawTitle === 'string' && rawTitle.trim() !== "" && rawTitle.trim().toLowerCase() !== "null" ? rawTitle.trim() : "";
  const descriptionForZod = typeof rawDescription === 'string' && rawDescription.trim().toLowerCase() !== "null" ? rawDescription.trim() : undefined;
  const file = rawFile instanceof File ? rawFile : null;

  console.log(`[uploadImageAction_ClientSDK] Extracted - Title: '${title}', File present: ${!!file}`);
  if (file) {
    console.log(`[uploadImageAction_ClientSDK] File details - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
  }

  try {
    console.log("[uploadImageAction_ClientSDK] Validating with Zod:", { title, descriptionForZod });
    mediaFormSchemaServer.parse({ title, description: descriptionForZod });
    console.log("[uploadImageAction_ClientSDK] Zod validation passed for title/description.");
    
    if (!file) {
      console.error("[uploadImageAction_ClientSDK] File validation failed: No file provided.");
      return { success: false, message: "No file provided." };
    }
    if (file.size > 25 * 1024 * 1024) {
      console.error(`[uploadImageAction_ClientSDK] File validation failed: File too large (${file.size} bytes). Max 25MB.`);
      return { success: false, message: "File is too large. Max 25MB." };
    }
    if (!file.type.startsWith("image/")) {
      console.error(`[uploadImageAction_ClientSDK] File validation failed: Invalid file type (${file.type}).`);
      return { success: false, message: "Invalid file type. Only images." };
    }
    console.log("[uploadImageAction_ClientSDK] File validation passed.");
    
    const secondaryApp = getSecondaryStorageApp();
    const storage = getStorage(secondaryApp);
    
    const timestamp = Date.now();
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${MEDIA_GALLERY_FOLDER_PATH}/${timestamp}_${originalFileName}`;
    const fileRef = storageRef(storage, filePath);

    console.log(`[uploadImageAction_ClientSDK] Uploading to Storage: ${filePath}`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    console.log("[uploadImageAction_ClientSDK] File uploaded to Storage.");

    const publicUrl = await getStorageDownloadURL(fileRef);
    console.log(`[uploadImageAction_ClientSDK] Public URL: ${publicUrl}`);

    const docId = sanitizeFilePathForDocId(filePath);
    await setDoc(doc(db, "media_gallery", docId), {
      title,
      description: descriptionForZod || null,
      imageUrl: publicUrl,
      filePath: filePath, 
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
      downloadCount: 0,
    });
    console.log("[uploadImageAction_ClientSDK] Metadata saved to Firestore.");
    return { success: true, message: "Image uploaded successfully!" };

  } catch (error: any) {
    console.error("[uploadImageAction_ClientSDK] Error during upload process:", error.message, error.stack);
    if (error instanceof z.ZodError) return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    if (error.code?.startsWith('storage/')) return { success: false, message: `Storage error: ${error.message}. Check Storage rules.` };
    return { success: false, message: error.message || "Upload failed." };
  }
}

export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  console.log(`[getGalleryImagesAction_ClientSDK] Action called. Admin view: ${adminView}. Target folder: '${MEDIA_GALLERY_FOLDER_PATH}'`);

  const db = primaryDbInstance;
  if (!db) {
    console.error("[getGalleryImagesAction_ClientSDK] CRITICAL: Primary Firestore DB (primaryDbInstance) is not available. Returning empty list.");
    return [];
  }
  console.log("[getGalleryImagesAction_ClientSDK] Primary Firestore DB instance is available.");

  const mediaItems: MediaItem[] = [];
  let secondaryApp: FirebaseApp;
  let storage: FirebaseStorage;

  try {
    secondaryApp = getSecondaryStorageApp();
    storage = getStorage(secondaryApp);
    console.log(`[getGalleryImagesAction_ClientSDK] Secondary Firebase Storage app initialized/retrieved for bucket: ${storage.app.options.storageBucket}`);
  } catch(initError: any) {
    console.error("[getGalleryImagesAction_ClientSDK] CRITICAL: Failed to initialize secondary Firebase app or get Storage instance:", initError.message, initError.stack);
    return [];
  }

  try {
    const listRef = storageRef(storage, MEDIA_GALLERY_FOLDER_PATH);
    console.log(`[getGalleryImagesAction_ClientSDK] Listing files from Storage path: '${listRef.fullPath}' in bucket '${listRef.bucket}'.`);
    
    const res = await listAll(listRef);
    // listAll result contains `items` (files) and `prefixes` (folders)
    console.log(`[getGalleryImagesAction_ClientSDK] listAll successful. Found ${res.items.length} file(s) and ${res.prefixes.length} folder(s) in Storage path '${MEDIA_GALLERY_FOLDER_PATH}'.`);

    if (res.items.length === 0) {
        console.warn(`[getGalleryImagesAction_ClientSDK] No files found directly in '${MEDIA_GALLERY_FOLDER_PATH}'. If files are in subfolders, listAll needs to be called recursively or structure adjusted. Check if files are directly in this folder.`);
        // No early return here, will proceed to fetch Firestore data, which might be empty too, leading to an empty final list.
    }
    
    const firestoreDataMap = new Map<string, any>();
    try {
        const firestoreCollectionRef = collection(db, "media_gallery");
        const firestoreDocsSnap = await getDocs(firestoreCollectionRef);
        firestoreDocsSnap.forEach(docSnap => {
            firestoreDataMap.set(docSnap.data().filePath, { id: docSnap.id, ...docSnap.data() });
        });
        console.log(`[getGalleryImagesAction_ClientSDK] Fetched ${firestoreDataMap.size} metadata documents from Firestore.`);
    } catch (fsError: any) {
        console.warn("[getGalleryImagesAction_ClientSDK] Could not fetch Firestore metadata, proceeding with Storage data only:", fsError.message, fsError.stack);
        // Continue, as we can still show images from storage if any are found by listAll.
    }
    
    let processedCount = 0;
    for (const itemRef of res.items) {
      const filePath = itemRef.fullPath; // e.g., "media_gallery/image.png"
      console.log(`[getGalleryImagesAction_ClientSDK] Processing storage item (${processedCount + 1}/${res.items.length}): ${filePath}`);
      try {
        const publicUrl = await getStorageDownloadURL(itemRef);
        console.log(`[getGalleryImagesAction_ClientSDK] Successfully got public URL for ${filePath}`);

        const storageFileMeta = await getStorageMetadata(itemRef);
        console.log(`[getGalleryImagesAction_ClientSDK] Successfully got storage metadata for ${filePath}. Created: ${storageFileMeta.timeCreated}, Size: ${storageFileMeta.size}`);

        const firestoreDoc = firestoreDataMap.get(filePath);
        const docId = firestoreDoc?.id || sanitizeFilePathForDocId(filePath);
        
        let titleFromFile = filePath.substring(MEDIA_GALLERY_FOLDER_PATH.length + (MEDIA_GALLERY_FOLDER_PATH ? 1 : 0)); // Remove "media_gallery/" or just "/"
        const lastDotIndex = titleFromFile.lastIndexOf('.');
        if (lastDotIndex > 0) titleFromFile = titleFromFile.substring(0, lastDotIndex); // Remove extension
        titleFromFile = titleFromFile.replace(/^\d+_/g, ''); // Remove numeric prefix like "1_" or "123_"
        titleFromFile = titleFromFile.replace(/^\d{8,15}_/, ''); // Remove long timestamp prefix like "20250618_"

        mediaItems.push({
          id: docId,
          title: firestoreDoc?.title || titleFromFile || "Untitled Image",
          description: firestoreDoc?.description || undefined,
          imageUrl: publicUrl,
          filePath: filePath,
          uploaderId: firestoreDoc?.uploaderId,
          uploaderName: firestoreDoc?.uploaderName,
          createdAt: firestoreDoc?.createdAt?.toDate ? firestoreDoc.createdAt.toDate() : (storageFileMeta.timeCreated ? new Date(storageFileMeta.timeCreated) : new Date()),
          downloadCount: firestoreDoc?.downloadCount || 0,
        });
        processedCount++;
      } catch (fileError: any) {
        console.error(`[getGalleryImagesAction_ClientSDK] Error processing individual storage item ${filePath}. Skipping this item. Error:`, fileError.message, fileError.stack);
        // Continue to next item
      }
    }
    
    console.log(`[getGalleryImagesAction_ClientSDK] Successfully processed ${processedCount} out of ${res.items.length} potential media items from storage.`);
    if (mediaItems.length > 0) {
        mediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        console.log(`[getGalleryImagesAction_ClientSDK] Sorted ${mediaItems.length} items. First item title: '${mediaItems[0].title}'`);
    } else {
        console.log(`[getGalleryImagesAction_ClientSDK] No media items to sort or return. The final list is empty.`);
    }
    return mediaItems;

  } catch (error: any) {
    console.error("[getGalleryImagesAction_ClientSDK] General error during file listing or processing pipeline:", error.message, error.stack);
    if (error.code?.startsWith('storage/')) {
        console.error(`[getGalleryImagesAction_ClientSDK] Storage error code: ${error.code}. Message: ${error.message}. Check Storage rules & path validity ('${MEDIA_GALLERY_FOLDER_PATH}').`);
    }
    return [];
  }
}

export async function updateImageMetadataAction(
  data: { filePath: string; imageUrl: string; title: string; description?: string; },
  author: { id: string; name?: string }
): Promise<{ success: boolean; message: string; updatedItem?: MediaItem }> {
  console.log(`[updateImageMetadataAction_ClientSDK] Called for filePath: ${data.filePath}`);
  const db = primaryDbInstance;
  if (!db) {
    console.error("[updateImageMetadataAction_ClientSDK] CRITICAL: Primary Firestore DB not available.");
    return { success: false, message: "Server configuration error: Firestore not available." };
  }
  try {
    const { filePath, imageUrl, title, description } = data;
    if (!title || title.trim() === "") return { success: false, message: "Title cannot be empty." };

    const docId = sanitizeFilePathForDocId(filePath);
    const docRef = doc(db, "media_gallery", docId);
    
    const currentDocSnap = await getDoc(docRef);
    let existingData: any = {};
    if (currentDocSnap.exists()) {
      existingData = currentDocSnap.data();
      console.log(`[updateImageMetadataAction_ClientSDK] Document ${docId} exists. Merging data.`);
    } else {
      console.log(`[updateImageMetadataAction_ClientSDK] Document ${docId} does not exist. Creating new.`);
    }
    
    const metadataToSave = { 
      title: title.trim(),
      description: description && description.trim() !== "" ? description.trim() : null,
      filePath: filePath, 
      imageUrl: imageUrl, // Preserve or set imageUrl from storage
      uploaderId: existingData.uploaderId || author.id, 
      uploaderName: existingData.uploaderName || author.name || "Admin",
      createdAt: existingData.createdAt || serverTimestamp(), // Preserve original or set new
      downloadCount: existingData.downloadCount || 0,
      updatedAt: serverTimestamp() 
    };
    
    await setDoc(docRef, metadataToSave, { merge: true }); 
    console.log(`[updateImageMetadataAction_ClientSDK] Metadata for ${docId} saved/merged.`);
    
    const savedDocSnap = await getDoc(docRef); // Re-fetch to get complete merged data with server timestamps
    const savedData = savedDocSnap.data();

    if (!savedData) { 
        console.error(`[updateImageMetadataAction_ClientSDK] Failed to retrieve updated metadata for ${docId}.`);
        return { success: false, message: "Failed to retrieve updated metadata." };
    }

    const updatedItem: MediaItem = {
        id: savedDocSnap.id,
        title: savedData.title,
        description: savedData.description,
        imageUrl: savedData.imageUrl,
        filePath: savedData.filePath,
        uploaderId: savedData.uploaderId,
        uploaderName: savedData.uploaderName,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : new Date(0), 
        downloadCount: savedData.downloadCount || 0,
    };
    return { success: true, message: "Image metadata updated.", updatedItem };

  } catch (error: any) {
    console.error("[updateImageMetadataAction_ClientSDK] Error saving metadata:", error.message, error.stack);
    return { success: false, message: error.message || "Failed to update metadata." };
  }
}

export async function deleteImageAction(filePathToDelete: string, docId: string) {
  console.log(`[deleteImageAction_ClientSDK] Called for filePath: ${filePathToDelete}, docId: ${docId}`);
  const db = primaryDbInstance;
  if (!db) {
     console.error("[deleteImageAction_ClientSDK] CRITICAL: Primary Firestore DB not available.");
     return { success: false, message: "Server configuration error (Firestore)." };
  }

  let secondaryApp;
  let storage;
  try {
    secondaryApp = getSecondaryStorageApp();
    storage = getStorage(secondaryApp);
  } catch(initError: any) {
    console.error("[deleteImageAction_ClientSDK] CRITICAL: Failed to initialize secondary Firebase app for storage:", initError.message, initError.stack);
    return { success: false, message: "Server configuration error (Storage init)." };
  }

  try {
    const fileRef = storageRef(storage, filePathToDelete); 
    console.log(`[deleteImageAction_ClientSDK] Attempting to delete from Storage: ${filePathToDelete}`);
    try {
        await deleteObject(fileRef);
        console.log(`[deleteImageAction_ClientSDK] Successfully deleted from Storage: ${filePathToDelete}`);
    } catch (storageError: any) {
        if (storageError.code === 'storage/object-not-found') {
            console.warn(`[deleteImageAction_ClientSDK] File not found in Storage ('${filePathToDelete}'), proceeding with Firestore deletion.`);
        } else {
            console.error(`[deleteImageAction_ClientSDK] Storage deletion error for '${filePathToDelete}':`, storageError.message);
            throw storageError; // Rethrow to be caught by the outer catch block
        }
    }

    const firestoreDocIdToDelete = docId || sanitizeFilePathForDocId(filePathToDelete);
    if (firestoreDocIdToDelete) {
        const firestoreDocRef = doc(db, "media_gallery", firestoreDocIdToDelete);
        await deleteDoc(firestoreDocRef);
        console.log(`[deleteImageAction_ClientSDK] Deleted Firestore document: ${firestoreDocIdToDelete}`);
    } else {
        console.warn(`[deleteImageAction_ClientSDK] No valid docId for Firestore deletion for filePath: ${filePathToDelete}`);
    }
    
    return { success: true, message: "Image and/or metadata deleted successfully." };
  } catch (error: any) {
    console.error(`[deleteImageAction_ClientSDK] Error during deletion process for ${filePathToDelete}:`, error.message, error.stack);
    return { success: false, message: "Failed to delete image. " + error.message };
  }
}

export async function incrementDownloadCountAction(docIdToUpdate: string): Promise<{ success: boolean; message?: string }> {
  console.log(`[incrementDownloadCountAction_ClientSDK] Called for docId: ${docIdToUpdate}`);
  const db = primaryDbInstance;
  if (!db) {
    console.error("[incrementDownloadCountAction_ClientSDK] CRITICAL: Primary Firestore DB not available.");
    return { success: false, message: "Server configuration error." };
  }
  if (!docIdToUpdate || docIdToUpdate.trim() === "") { 
    console.warn("[incrementDownloadCountAction_ClientSDK] Document ID is required, received empty or null.");
    return { success: false, message: "Document ID is required." };
  }
  try {
    const docRef = doc(db, "media_gallery", docIdToUpdate);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        console.warn(`[incrementDownloadCountAction_ClientSDK] Document ${docIdToUpdate} not found in Firestore. Cannot increment download count.`);
        // Don't treat as a hard error for the user, but log it.
        // It's possible for a file to exist in storage without a metadata doc if console-uploaded and never edited.
        return { success: false, message: "Metadata record not found. Count not updated."};
    }
    await updateDoc(docRef, { downloadCount: increment(1) });
    console.log(`[incrementDownloadCountAction_ClientSDK] Download count for ${docIdToUpdate} incremented.`);
    return { success: true, message: "Download count incremented." };
  } catch (error: any) {
    console.error(`[incrementDownloadCountAction_ClientSDK] Error incrementing download count for ${docIdToUpdate}:`, error.message, error.stack);
    return { success: false, message: "Failed to increment download count. " + error.message };
  }
}
    

    