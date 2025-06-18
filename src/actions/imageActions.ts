
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
  query as firestoreQuery, 
  where,
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
  getMetadata as getStorageMetadata
} from "firebase/storage";
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";

// Primary Firestore DB (from ashara-mubaraka-app, initialized in firebase.ts)
// Ensure primaryDb is correctly imported and initialized in your src/lib/firebase.ts
// For server actions, it's typically better to initialize Firestore here or pass it if necessary,
// but for simplicity per request, we'll assume primaryDb from client-side init is available IF this action runs in a context where it's shared.
// THIS IS UNCONVENTIONAL for server actions. Usually, Admin SDK is used.
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

const SECONDARY_STORAGE_APP_NAME = "FirebaseLnvFmbStorageAppForImageActions"; // Unique name
const MEDIA_GALLERY_FOLDER_PATH = "media_gallery";


function getSecondaryStorageApp(): FirebaseApp {
  const apps = getApps();
  const existingApp = apps.find(app => app.name === SECONDARY_STORAGE_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  // Log all app names for debugging
  // console.log("Currently initialized Firebase apps:", apps.map(app => app.name));
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

  const db = primaryDbInstance; // Use the imported primary DB instance
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

  try {
    mediaFormSchemaServer.parse({ title, description: descriptionForZod });
    
    if (!file) return { success: false, message: "No file provided." };
    if (file.size > 25 * 1024 * 1024) return { success: false, message: "File is too large. Max 25MB." };
    if (!file.type.startsWith("image/")) return { success: false, message: "Invalid file type. Only images." };
    
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
    console.error("[uploadImageAction_ClientSDK] Error:", error);
    if (error instanceof z.ZodError) return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    if (error.code?.startsWith('storage/')) return { success: false, message: `Storage error: ${error.message}. Check Storage rules.` };
    return { success: false, message: error.message || "Upload failed." };
  }
}

export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  console.log(`[getGalleryImagesAction_ClientSDK] Called. Admin view: ${adminView}.`);
  
  const db = primaryDbInstance;
  if (!db) {
    console.error("[getGalleryImagesAction_ClientSDK] CRITICAL: Primary Firestore DB not available.");
    return [];
  }
  
  const mediaItems: MediaItem[] = [];
  let secondaryApp;
  let storage;

  try {
    secondaryApp = getSecondaryStorageApp();
    storage = getStorage(secondaryApp);
  } catch(initError) {
    console.error("[getGalleryImagesAction_ClientSDK] CRITICAL: Failed to initialize secondary Firebase app for storage:", initError);
    return [];
  }

  try {
    const listRef = storageRef(storage, MEDIA_GALLERY_FOLDER_PATH);
    const res = await listAll(listRef);
    console.log(`[getGalleryImagesAction_ClientSDK] Found ${res.items.length} files in Storage path '${MEDIA_GALLERY_FOLDER_PATH}'.`);

    const firestoreDataMap = new Map<string, any>();
    try {
        const firestoreCollectionRef = collection(db, "media_gallery");
        const firestoreDocsSnap = await getDocs(firestoreCollectionRef);
        firestoreDocsSnap.forEach(docSnap => {
            firestoreDataMap.set(docSnap.data().filePath, { id: docSnap.id, ...docSnap.data() });
        });
        console.log(`[getGalleryImagesAction_ClientSDK] Fetched ${firestoreDataMap.size} metadata documents from Firestore.`);
    } catch (fsError) {
        console.warn("[getGalleryImagesAction_ClientSDK] Could not fetch Firestore metadata, proceeding with Storage data only:", fsError);
    }
    
    for (const itemRef of res.items) {
      const filePath = itemRef.fullPath;
      console.log(`[getGalleryImagesAction_ClientSDK] Processing storage item: ${filePath}`);
      try {
        const [publicUrl, storageFileMeta] = await Promise.all([
          getStorageDownloadURL(itemRef),
          getStorageMetadata(itemRef) // Use getStorageMetadata for client SDK
        ]);

        const firestoreDoc = firestoreDataMap.get(filePath);
        const docId = firestoreDoc?.id || sanitizeFilePathForDocId(filePath);
        
        let titleFromFile = filePath.substring(filePath.lastIndexOf('/') + 1);
        const lastDotIndex = titleFromFile.lastIndexOf('.');
        if (lastDotIndex > 0) titleFromFile = titleFromFile.substring(0, lastDotIndex);
        titleFromFile = titleFromFile.replace(/^\d+_/, ''); 
        titleFromFile = titleFromFile.replace(/^\d{10,15}_/, ''); 

        mediaItems.push({
          id: docId,
          title: firestoreDoc?.title || titleFromFile,
          description: firestoreDoc?.description || undefined, // Ensure it's undefined if null/empty
          imageUrl: publicUrl,
          filePath: filePath,
          uploaderId: firestoreDoc?.uploaderId,
          uploaderName: firestoreDoc?.uploaderName,
          createdAt: firestoreDoc?.createdAt?.toDate ? firestoreDoc.createdAt.toDate() : (storageFileMeta.timeCreated ? new Date(storageFileMeta.timeCreated) : new Date()),
          downloadCount: firestoreDoc?.downloadCount || 0,
        });
      } catch (fileError: any) {
        console.error(`[getGalleryImagesAction_ClientSDK] Error processing storage item ${filePath}:`, fileError.message, fileError.stack);
      }
    }
    
    console.log(`[getGalleryImagesAction_ClientSDK] Successfully processed ${mediaItems.length} media items from storage.`);
    mediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return mediaItems;

  } catch (error: any) {
    console.error("[getGalleryImagesAction_ClientSDK] Error listing files from Firebase Storage:", error.message, error.stack);
    if (error.code?.startsWith('storage/')) {
        console.error(`[getGalleryImagesAction_ClientSDK] Storage error: ${error.message}. Check rules & path.`);
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
      console.log(`[updateImageMetadataAction_ClientSDK] Document ${docId} exists.`);
    } else {
      console.log(`[updateImageMetadataAction_ClientSDK] Document ${docId} does not exist. Creating new.`);
    }
    
    const metadataToSave = { 
      title: title.trim(),
      description: description && description.trim() !== "" ? description.trim() : null,
      filePath: filePath, 
      imageUrl: imageUrl, 
      uploaderId: existingData.uploaderId || author.id, // Preserve original uploader if exists
      uploaderName: existingData.uploaderName || author.name || "Admin", // Preserve original uploader name
      createdAt: existingData.createdAt || serverTimestamp(), // Preserve original createdAt
      downloadCount: existingData.downloadCount || 0, // Preserve download count
      updatedAt: serverTimestamp() 
    };
    
    await setDoc(docRef, metadataToSave, { merge: true }); // Merge true will create if not exists, or update existing fields
    console.log(`[updateImageMetadataAction_ClientSDK] Metadata for ${docId} saved.`);
    
    const savedDocSnap = await getDoc(docRef);
    const savedData = savedDocSnap.data();

    if (!savedData) { 
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
        createdAt: savedData.createdAt?.toDate ? savedData.createdAt.toDate() : new Date(0), // Handle Timestamp
        downloadCount: savedData.downloadCount || 0,
    };
    return { success: true, message: "Image metadata updated.", updatedItem };

  } catch (error: any) {
    console.error("[updateImageMetadataAction_ClientSDK] Error:", error.message, error.stack);
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
  } catch(initError) {
    console.error("[deleteImageAction_ClientSDK] CRITICAL: Failed to initialize secondary Firebase app for storage:", initError);
    return { success: false, message: "Server configuration error (Storage init)." };
  }

  try {
    const fileRef = storageRef(storage, filePathToDelete); 
    console.log(`[deleteImageAction_ClientSDK] Attempting to delete from Storage: ${filePathToDelete}`);
    try {
        await deleteObject(fileRef);
        console.log(`[deleteImageAction_ClientSDK] Successfully deleted from Storage.`);
    } catch (storageError: any) {
        if (storageError.code === 'storage/object-not-found') {
            console.warn(`[deleteImageAction_ClientSDK] File not found in Storage, proceeding with Firestore.`);
        } else {
            console.error(`[deleteImageAction_ClientSDK] Storage deletion error:`, storageError.message);
            throw storageError; 
        }
    }

    const firestoreDocIdToDelete = docId || sanitizeFilePathForDocId(filePathToDelete);
    const firestoreDocRef = doc(db, "media_gallery", firestoreDocIdToDelete);
    await deleteDoc(firestoreDocRef);
    console.log(`[deleteImageAction_ClientSDK] Deleted Firestore document: ${firestoreDocIdToDelete}`);
    
    return { success: true, message: "Image deleted successfully." };
  } catch (error: any) {
    console.error(`[deleteImageAction_ClientSDK] Error:`, error.message, error.stack);
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
    return { success: false, message: "Document ID is required." };
  }
  try {
    const docRef = doc(db, "media_gallery", docIdToUpdate);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        console.warn(`[incrementDownloadCountAction_ClientSDK] Document ${docIdToUpdate} not in Firestore.`);
        return { success: false, message: "Metadata record not found. Count not updated."};
    }
    await updateDoc(docRef, { downloadCount: increment(1) });
    console.log(`[incrementDownloadCountAction_ClientSDK] Download count for ${docIdToUpdate} incremented.`);
    return { success: true, message: "Download count incremented." };
  } catch (error: any) {
    console.error(`[incrementDownloadCountAction_ClientSDK] Error:`, error.message, error.stack);
    return { success: false, message: "Failed to increment download count. " + error.message };
  }
}
    