
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Ensure this is only run on the server
if (typeof window !== 'undefined') {
  // In a Next.js app, this check might not be strictly necessary for server actions,
  // but it's good practice if the file could be accidentally imported elsewhere.
  // Server actions are guaranteed to run on the server.
}

let initialized = admin.apps.length > 0;

if (!initialized) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment variables
  // It's used to construct the default storage bucket name.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ashara-mubaraka-app";

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${projectId}.appspot.com`
      });
      console.log('Firebase Admin SDK initialized with service account JSON.');
      initialized = true;
    } catch (error: any) {
      console.error('Firebase Admin SDK [JSON] initialization error:', error.message);
      // Log the error but don't re-throw, allow conditional exports to be null
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // This path is less common for serverless/edge environments like Cloudflare Pages.
    // Prefer FIREBASE_SERVICE_ACCOUNT_JSON.
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: `${projectId}.appspot.com`
        });
        console.log('Firebase Admin SDK initialized via Application Default Credentials.');
        initialized = true;
    } catch (error: any) {
        console.error('Firebase Admin SDK [ADC] initialization error:', error.message);
    }
  }
  
  if (!initialized) {
    console.warn(
      'CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or GOOGLE_APPLICATION_CREDENTIALS environment variable is not set or failed to initialize. ' +
      'Firebase Admin SDK features (like server-side image uploads) will NOT work.'
    );
  }
}

// Export conditionally to prevent runtime errors if initialization failed
export const adminDb = initialized ? admin.firestore() : null;
export const adminStorage = initialized ? admin.storage() : null;
const adminAuthModule = initialized ? admin.auth() : null;

export { adminAuthModule as adminAuth }; // For potential future use
export default admin; // Export default admin for other potential uses (e.g., admin.firestore.Timestamp)
