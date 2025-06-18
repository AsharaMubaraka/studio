
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

if (typeof window !== 'undefined') {
  console.error("CRITICAL: firebaseAdmin.ts is being imported on the client-side. This should not happen.");
  // This file should only be run on the server.
}

let initialized = admin.apps.length > 0;
const primaryProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ashara-mubaraka-app"; // This is the project ID for Firestore, Auth, etc.
const targetStorageBucketName = "lnv-fmb.appspot.com"; // Explicitly defined storage bucket for images

if (!initialized) {
  console.log('[Firebase Admin] SDK not initialized. Attempting initialization...');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // The storageBucket in initializeApp is for the *default* bucket for admin.storage()
        // We will explicitly use admin.storage().bucket(targetStorageBucketName) later for image operations.
        // So, we can set this to the primary project's default bucket or omit if not strictly needed for other default operations.
        storageBucket: `${primaryProjectId}.appspot.com` 
      });
      console.log('[Firebase Admin] SDK initialized successfully with service account JSON for project:', serviceAccount.project_id);
      initialized = true;
    } catch (error: any) {
      console.error('[Firebase Admin] SDK [JSON] initialization error:', error.message);
      // Fallback for environments like Google Cloud Functions (less relevant for Netlify usually)
      try {
        admin.initializeApp();
        console.log('[Firebase Admin] SDK initialized successfully with default credentials (e.g., Application Default Credentials).');
        initialized = true;
      } catch (fallbackError: any) {
        console.error('[Firebase Admin] SDK default initialization error:', fallbackError.message);
      }
    }
  } else {
     console.warn(
      '[Firebase Admin] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'Firebase Admin SDK features will NOT work.'
    );
  }
} else {
  console.log('[Firebase Admin] SDK already initialized.');
}

export const adminDb = initialized ? admin.firestore() : null;
// For storage, we will get a specific bucket reference in imageActions.ts
export const adminStorage = initialized ? admin.storage() : null; 
const adminAuthModule = initialized ? admin.auth() : null;

export { adminAuthModule as adminAuth };
export default admin;
