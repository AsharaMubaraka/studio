
import { initializeApp, getApps, type FirebaseApp, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { toast } from "@/hooks/use-toast";

// Primary Firebase configuration (for Firestore, Auth, Messaging)
const primaryFirebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.appspot.com", // Default bucket for primary app
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:6e1dd3e6903d64f82395aa",
};

// Secondary Firebase configuration (specifically for Storage)
const secondaryStorageFirebaseConfig = {
  apiKey: "AIzaSyBXtRwAXnxP2Zhi4a62qamgUSny4x_kNRQ",
  authDomain: "lnv-fmb.firebaseapp.com",
  projectId: "lnv-fmb",
  storageBucket: "lnv-fmb.appspot.com", // THE BUCKET WE WANT TO USE FOR IMAGES
  messagingSenderId: "819680208785",
  appId: "1:819680208785:web:4e3fbe0d91fb4013fedc30"
};

let primaryFirebaseApp: FirebaseApp;
let secondaryStorageFirebaseApp: FirebaseApp;

let db: ReturnType<typeof getFirestore> | null = null;
let imageStorage: FirebaseStorage | null = null; // This will be from the secondary app
let messaging: ReturnType<typeof getMessaging> | null = null;

try {
  const primaryAppName = "DEFAULT"; // Standard way to refer to the default app
  const secondaryStorageAppName = "ImageStorageApp"; // Custom name for the secondary app

  // Initialize Primary App (or get it if already initialized)
  if (getApps().find(app => app.name === primaryAppName || app.name === "[DEFAULT]")) {
    primaryFirebaseApp = getApp(primaryAppName);
    console.log("Primary Firebase app (ashara-mubaraka-app) already initialized.");
  } else {
    primaryFirebaseApp = initializeApp(primaryFirebaseConfig, primaryAppName);
    console.log("Primary Firebase app (ashara-mubaraka-app) initialized successfully.");
  }

  // Initialize Secondary Storage App (or get it if already initialized)
  if (getApps().find(app => app.name === secondaryStorageAppName)) {
    secondaryStorageFirebaseApp = getApp(secondaryStorageAppName);
    console.log("Secondary Firebase app for Storage (lnv-fmb) already initialized.");
  } else {
    secondaryStorageFirebaseApp = initializeApp(secondaryStorageFirebaseConfig, secondaryStorageAppName);
    console.log("Secondary Firebase app for Storage (lnv-fmb) initialized successfully.");
  }

  // Initialize Firestore with persistence if not SSR, using the PRIMARY app
  if (typeof window !== 'undefined') {
    db = initializeFirestore(primaryFirebaseApp, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
  } else {
    db = getFirestore(primaryFirebaseApp);
  }
  console.log("Firestore initialized successfully for primary app.");

  // Initialize Storage using the SECONDARY app
  imageStorage = getStorage(secondaryStorageFirebaseApp);
  console.log("Firebase Storage initialized successfully for secondary app (lnv-fmb).");
  
  // Initialize Messaging using the PRIMARY app
  if (typeof window !== 'undefined') {
    messaging = getMessaging(primaryFirebaseApp);
    console.log("Firebase Messaging initialized successfully for primary app.");
  }

} catch (error) {
  console.error("CRITICAL: Error initializing Firebase client SDKs:", error);
  // db, imageStorage, messaging might remain null
}


const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && messaging && 'Notification' in window && 'serviceWorker' in navigator) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        // VAPID key from your PRIMARY Firebase project (ashara-mubaraka-app)
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY; // This should be for ashara-mubaraka-app
        if (!vapidKey) {
            console.error("VAPID key is not set for primary project. Push notifications may not work.");
            toast({ variant: "destructive", title: "Config Error", description: "Push notification key missing."});
            return null;
        }
        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          return currentToken;
        } else {
          console.log('No registration token available. Request permission to generate one.');
          return null;
        }
      } else {
        console.log('Unable to get permission to notify.');
        return null;
      }
    } catch (error) {
      console.error('An error occurred while requesting notification permission. ', error);
      return null;
    }
  }
  console.log('Push Notifications not supported, window is not defined, or messaging not initialized.');
  return null;
};

if (typeof window !== 'undefined' && messaging) {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    toast({
      title: payload.notification?.title || "New Notification",
      description: payload.notification?.body,
    });
    if (navigator.vibrate && navigator.vibrate([200, 100, 200])) {
      console.log("Device vibrated for notification.");
    } else {
      console.log("Vibration not supported or not triggered.");
    }
  });
}

export { db, imageStorage, primaryFirebaseApp, secondaryStorageFirebaseApp, requestNotificationPermission, getMessaging as getFcmMessaging };
