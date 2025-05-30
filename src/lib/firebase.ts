
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
    return getMessaging(firebaseApp);
  }
  return null;
};

const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        const messaging = getFcmMessaging();
        if (messaging) {
          // TODO: Replace 'YOUR_VAPID_KEY' with your actual VAPID key from Firebase Console
          // (Firebase Console > Project settings > Cloud Messaging > Web configuration > Web Push certificates)
          const currentToken = await getToken(messaging, { vapidKey: 'BPiO8hP7rU8_q9y9Y1F2g0J6z_Q4O2X7K9y_y0J_sR0P6uY8o_bY2C7zQ_tX_y_sR5b_iR5B_kR_tK_lO7n_iE' });
          if (currentToken) {
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

// Optional: Handle foreground messages
if (typeof window !== 'undefined') {
  const messagingInstance = getFcmMessaging();
  if (messagingInstance) {
    onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground. ', payload);
      // Customize notification handling here (e.g., show a custom toast)
      // For example:
      // new Notification(payload.notification?.title || 'New Message', {
      //   body: payload.notification?.body,
      //   icon: payload.notification?.icon,
      // });
    });
  }
}


export { db, firebaseApp, requestNotificationPermission, getFcmMessaging };
