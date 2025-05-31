
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
// Removed getStorage import
import { toast } from "@/hooks/use-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.appspot.com",
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:a13b4c2ad1c047482395aa",
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: Add if you use Analytics
};

// Initialize Firebase
let firebaseApp: FirebaseApp;
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

const db = getFirestore(firebaseApp);
// Removed storage initialization
// const storage = getStorage(firebaseApp); 

// Initialize Firebase Cloud Messaging and get a reference to the service
const getFcmMessaging = () => {
  if (typeof window !== 'undefined' && firebaseApp) {
    try {
      return getMessaging(firebaseApp);
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
      return null;
    }
  }
  return null;
};

const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        const messaging = getFcmMessaging();
        if (messaging) {
          // VAPID key from Firebase Console > Project settings > Cloud Messaging > Web configuration > Web Push certificates
          const currentToken = await getToken(messaging, { vapidKey: 'BOCO7fqrEu4j4Jbvi-EjM5xeO05U3iTudgVyz2CkxlwXgtlmWBQi-KvBaWIfRLNFHISJTKnhetxCn_1-jzj8vdc' });
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            return currentToken;
          } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
          }
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
  console.log('Push Notifications not supported or window is not defined.');
  return null;
};

// Handle foreground messages
if (typeof window !== 'undefined') {
  const messagingInstance = getFcmMessaging();
  if (messagingInstance) {
    onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground. ', payload);
      toast({
        title: payload.notification?.title || "New Notification",
        description: payload.notification?.body,
      });
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    });
  }
}

export { db, firebaseApp, requestNotificationPermission, getFcmMessaging }; // Removed storage from exports
