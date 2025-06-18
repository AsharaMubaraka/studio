
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, orderBy, Timestamp, updateDoc, increment } from "firebase/firestore";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary - ensure environment variables are set in your deployment
console.log("[Cloudinary Config] Attempting to configure Cloudinary SDK. Checking environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET");

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    console.log("[Cloudinary Config] SDK configured with Cloud Name: " + process.env.CLOUDINARY_CLOUD_NAME);
} else {
    console.warn("[Cloudinary Config] Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set. Image upload/delete might fail.");
}

const mediaFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
  // File validation is handled by checking instance of File in action
});

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  publicId: string; // Cloudinary public_id
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


  console.log(`[Cloudinary Upload] Attempting to read CLOUDINARY_UPLOAD_PRESET. Value: '${process.env.CLOUDINARY_UPLOAD_PRESET}'`);
  if (!process.env.CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET.trim() === "") {
    console.error("CLOUDINARY_UPLOAD_PRESET is not set or is an empty string.");
    return { success: false, message: "Server configuration error: Upload preset missing." };
  }
  if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
    console.error("Cloudinary SDK not fully configured. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment variables.");
    return { success: false, message: "Server configuration error: Cloudinary not configured. Admin should check server logs." };
  }

  // Refined parsing for Zod
  const title = typeof rawTitle === 'string' ? rawTitle : ""; // Default to empty string; Zod's min(2) will catch it if it's too short.
  const descriptionForZod = typeof rawDescription === 'string' ? rawDescription : undefined; // undefined if not a string, works with .optional()

  const file = rawFile instanceof File ? rawFile : null;

  try {
    console.log(`[uploadImageAction] Validating with Zod: title='${title}', description='${descriptionForZod}'`);
    mediaFormSchema.parse({ title, description: descriptionForZod });
    
    if (!file) {
      console.error("[uploadImageAction] File validation failed: No file or invalid file object received on server.");
      throw new Error("No file or invalid file provided. Ensure a file is selected.");
    }
    if (file.size > 25 * 1024 * 1024) {
        console.error(`[uploadImageAction] File validation failed: File too large. Size: ${file.size}`);
        throw new Error("File is too large. Max 25MB allowed.");
    }
    if (!file.type.startsWith("image/")) {
        console.error(`[uploadImageAction] File validation failed: Invalid file type. Type: ${file.type}`);
        throw new Error("Invalid file type. Only images are allowed.");
    }

    console.log("[uploadImageAction] File validation passed. Converting to buffer.");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[uploadImageAction] Buffer created. Uploading to Cloudinary...");

    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error inside stream callback:", error);
            reject(error);
          } else {
            console.log("[uploadImageAction] Cloudinary upload successful.");
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    if (!uploadResult || !uploadResult.secure_url || !uploadResult.public_id) {
      console.error("Cloudinary upload failed or returned invalid data. Result:", uploadResult);
      throw new Error("Cloudinary upload failed or returned invalid data.");
    }

    console.log("[uploadImageAction] Saving to Firestore.");
    await addDoc(collection(db, "media_gallery"), {
      title, // Use the validated title
      description: descriptionForZod, // Use the validated (and possibly undefined) description
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
      downloadCount: 0,
    });
    console.log("[uploadImageAction] Successfully saved to Firestore.");
    return { success: true, message: "Image uploaded and saved successfully!" };

  } catch (error: any) {
    console.error("[uploadImageAction Caught Error] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error("[uploadImageAction Caught Error] Error name:", error.name);
    console.error("[uploadImageAction Caught Error] Error message:", error.message);
    if (error.stack) {
        console.error("[uploadImageAction Caught Error] Error stack:", error.stack);
    }
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    const errorMessage = error?.message || "An_unknown_error_occurred_during_image_upload._Check_server_logs.";
    return { success: false, message: errorMessage };
  }
}


export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  try {
    const mediaCollectionRef = collection(db, "media_gallery");
    const q = query(mediaCollectionRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        publicId: data.publicId,
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

export async function deleteImageAction(publicId: string, docId: string) {
  if (!cloudinary.config().api_key || !cloudinary.config().api_secret || !cloudinary.config().cloud_name) { 
     console.error("Cloudinary Admin API not configured for deletion. Check environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
     return { success: false, message: "Server configuration error: Cannot delete from Cloudinary. Admin should check server logs." };
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    const docRef = doc(db, "media_gallery", docId);
    await deleteDoc(docRef);
    return { success: true, message: "Image deleted successfully from Cloudinary and database." };
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return { success: false, message: "Failed to delete image. It might still exist in Cloudinary or the database. Check server logs." };
  }
}

export async function incrementDownloadCountAction(docId: string): Promise<{ success: boolean; message?: string }> {
  if (!docId) {
    return { success: false, message: "Document ID is required to increment download count." };
  }
  try {
    const docRef = doc(db, "media_gallery", docId);
    await updateDoc(docRef, {
      downloadCount: increment(1)
    });
    return { success: true, message: "Download count incremented." };
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return { success: false, message: "Failed to increment download count." };
  }
}
    

    