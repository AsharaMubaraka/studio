
// Scripts for Firebase v10.12.2
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with your project config
const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.firebasestorage.app",
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:a13b4c2ad1c047482395aa"
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: payload.notification?.icon || '/logo-192.png', // Default icon if not provided
    // You can add more options here: e.g. image, actions, data for click_action
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  event.notification.close();
  // Add logic to open a specific page or focus the app
  // For example, focusing the most recent window:
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/'); // Open a default page if no window is open
    })
  );
});
