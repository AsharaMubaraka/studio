
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { toast } from "@/hooks/use-toast"; // Import toast

const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.firebasestorage.app",
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
          const currentToken = await getToken(messaging, { vapidKey: 'BOCO7fqrEu4j4Jbvi-EjM5xeO05U3iTudgVyz2CkxlwXgtlmWBQi-KvBaWIfRLNFHISJTKnhetxCn_1-jzj8vdc' }); // Replace 'YOUR_VAPID_KEY' with your actual VAPID key
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            // TODO: Send this token to your server and store it associated with the user
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
      // Customize notification handling here (e.g., show a custom toast)
      toast({
        title: payload.notification?.title || "New Notification",
        description: payload.notification?.body,
      });
      // Attempt to vibrate
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Example vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
      }
      // Potentially trigger a refetch of notifications on the dashboard or announcement page
      // For example, by dispatching a custom event that relevant components listen to.
    });
  }
}

export { db, firebaseApp, requestNotificationPermission, getFcmMessaging };
    
