
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
// Use the same config as in your src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.firebasestorage.app", // Updated
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:6e1dd3e6903d64f82395aa" // Updated
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // Optional: Add a default icon
    image: payload.notification?.image, // Optional: if you send image in notification payload
    badge: '/icons/badge-72x72.png', // Optional: Add a badge icon
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Optional: vibration pattern
    tag: payload.data?.tag || 'default-tag', // Optional: Group notifications or make them replaceable
    data: payload.data // Pass along any data sent with the notification
  };

  // Check if the client (browser tab) is focused
  // This part is more complex as service workers don't directly know about tab focus.
  // The common pattern is to send a message to clients to check visibility.
  // For simplicity, we'll just show the notification. If the app is in the foreground,
  // the foreground handler in firebase.ts will take precedence.

  self.registration.showNotification(notificationTitle, notificationOptions);

  // Optional: Send a message to any open client tabs
  // self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
  //   if (windowClients && windowClients.length > 0) {
  //     windowClients.forEach((windowClient) => {
  //       windowClient.postMessage({
  //         message: 'Received a new FCM message.',
  //         payload: payload,
  //       });
  //     });
  //   }
  // });
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/announcements'; // Default to announcements or use URL from data payload

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client (browser window/tab) is already open at the target URL
        if (client.url === self.location.origin + targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no client is open at the target URL, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
