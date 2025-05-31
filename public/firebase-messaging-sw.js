
// Import Firebase SDKs using compat versions for service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT:
// This firebaseConfig object MUST be kept in sync with the one in src/lib/firebase.ts
// If you update it in one place, update it here too.
const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.appspot.com",
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:a13b4c2ad1c047482395aa",
};

// Initialize Firebase
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message: ',
    payload
  );

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    // icon: '/path/to/your/icon.png', // Optional: Add a default icon in your public folder
    // badge: '/path/to/your/badge.png', // Optional
    // image: payload.notification?.image // If your payload contains an image
    // You can add more options here: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
  };

  if (!self.registration) {
    console.error("[firebase-messaging-sw.js] self.registration is not available.");
    return Promise.resolve();
  }

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
