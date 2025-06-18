
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
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
  // downloadCount: number; // Deferred for now
}

export async function uploadImageAction(formData: FormData, author: {id: string; name?: string}) {
  console.log(`[Cloudinary Upload] Action started. Attempting to read CLOUDINARY_UPLOAD_PRESET. Value: '${process.env.CLOUDINARY_UPLOAD_PRESET}'`);
  if (!process.env.CLOUDINARY_UPLOAD_PRESET) {
    console.error("CLOUDINARY_UPLOAD_PRESET is not set or is an empty string.");
    return { success: false, message: "Server configuration error: Upload preset missing." };
  }
  if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
    console.error("Cloudinary SDK not fully configured. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment variables.");
    return { success: false, message: "Server configuration error: Cloudinary not configured. Admin should check server logs." };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string | undefined;
  const file = formData.get("file") as File | null;

  try {
    mediaFormSchema.parse({ title, description }); // Validate text fields
    if (!file || !(file instanceof File)) {
      throw new Error("No file or invalid file provided.");
    }
    if (file.size > 10 * 1024 * 1024) { // Example: 10MB limit
        throw new Error("File is too large. Max 10MB allowed.");
    }
    if (!file.type.startsWith("image/")) {
        throw new Error("Invalid file type. Only images are allowed.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          resource_type: "image",
          // folder: "media_gallery", // Optional: organize in Cloudinary
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    if (!uploadResult || !uploadResult.secure_url || !uploadResult.public_id) {
      throw new Error("Cloudinary upload failed or returned invalid data.");
    }

    await addDoc(collection(db, "media_gallery"), {
      title,
      description: description || null,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      uploaderId: author.id,
      uploaderName: author.name || "Admin",
      createdAt: serverTimestamp(),
      // downloadCount: 0, // Deferred
    });

    return { success: true, message: "Image uploaded and saved successfully!" };

  } catch (error: any) {
    console.error("Error in uploadImageAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validation failed.", errors: error.flatten().fieldErrors };
    }
    return { success: false, message: error.message || "Failed to upload image. See server logs." };
  }
}


export async function getGalleryImagesAction(adminView: boolean = false): Promise<MediaItem[]> {
  try {
    const mediaCollectionRef = collection(db, "media_gallery");
    // Sort by newest first
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
        // downloadCount: data.downloadCount || 0, // Deferred
      };
    });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

export async function deleteImageAction(publicId: string, docId: string) {
  if (!cloudinary.config().api_key || !cloudinary.config().api_secret || !cloudinary.config().cloud_name) { 
     console.error("Cloudinary Admin API not configured for deletion. Check environment variables.");
     return { success: false, message: "Server configuration error: Cannot delete from Cloudinary. Admin should check server logs." };
  }
  try {
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });

    // Delete from Firestore
    const docRef = doc(db, "media_gallery", docId);
    await deleteDoc(docRef);

    return { success: true, message: "Image deleted successfully from Cloudinary and database." };
  } catch (error: any) {
    console.error("Error deleting image:", error);
    // Attempt to determine if Cloudinary part failed or Firestore part failed for better message
    // For now, generic message
    return { success: false, message: "Failed to delete image. It might still exist in Cloudinary or the database. Check server logs." };
  }
}

// Placeholder for download count increment, if added later
// export async function incrementDownloadCountAction(docId: string) { ... }
