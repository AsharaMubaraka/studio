
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

if (typeof window !== 'undefined') {
  // This file should only be run on the server.
}

let initialized = admin.apps.length > 0;
const primaryProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ashara-mubaraka-app";

if (!initialized) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      // Initialize for the primary project (used for Firestore, Auth etc.)
      // The storageBucket here will be for the primary project if admin.storage() is called without args.
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${primaryProjectId}.appspot.com` 
      });
      console.log('Firebase Admin SDK initialized with service account JSON for project:', serviceAccount.project_id);
      initialized = true;
    } catch (error: any) {
      console.error('Firebase Admin SDK [JSON] initialization error:', error.message);
    }
  } else {
     console.warn(
      'CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'Firebase Admin SDK features will NOT work.'
    );
  }
}

// adminDb will use the default initialized app (ashara-mubaraka-app)
export const adminDb = initialized ? admin.firestore() : null;

// adminStorage will also default to the storage of the initialized app.
// For operations on a *different* storage bucket (like lnv-fmb.appspot.com),
// the bucket must be explicitly specified when getting a reference:
// e.g., admin.storage().bucket("lnv-fmb.appspot.com")
export const adminStorage = initialized ? admin.storage() : null;

const adminAuthModule = initialized ? admin.auth() : null;

export { adminAuthModule as adminAuth };
export default admin;
