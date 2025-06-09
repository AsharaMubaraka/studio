
// Import the Firebase app and messaging SDKs
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Your web app's Firebase configuration
// Ensure this matches the config in src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA8w8a0ap2sOYroS8-qNSsMNPqmXB-vL8g",
  authDomain: "ashara-mubaraka-app.firebaseapp.com",
  projectId: "ashara-mubaraka-app",
  storageBucket: "ashara-mubaraka-app.firebasestorage.app",
  messagingSenderId: "572648688031",
  appId: "1:572648688031:web:6e1dd3e6903d64f82395aa",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || 'https://ashara1447.udaem.site/transport/logo.png', // Default icon
    badge: 'https://ashara1447.udaem.site/transport/logo.png', // Default badge
    // image: payload.notification?.image, // Optional: if your payload includes an image
    // data: payload.data, // Optional: to pass data to the notification click handler
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .catch(err => console.error("Error showing notification from SW:", err));

  // Optional: If you want to handle notification clicks
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
    event.notification.close();

    // This looks to see if the current is already open and
    // focuses if it is
    event.waitUntil(clients.matchAll({
      type: "window"
    }).then((clientList) => {
      for (const client of clientList) {
        // You might want to navigate to a specific page based on event.notification.data
        if (client.url == '/' && 'focus' in client) // Example: focus or navigate if root is open
          return client.focus();
      }
      if (clients.openWindow) // Open a new window/tab
        return clients.openWindow('/'); // Or a specific URL from event.notification.data
    }));
  });
});
