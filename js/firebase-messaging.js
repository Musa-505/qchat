// firebase-messaging.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging.js';

// Your existing Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqkJwrKxdpWkQCY9EfsDrGqoE482G1q10",
    authDomain: "qchat-f929a.firebaseapp.com",
    projectId: "qchat-f929a",
    storageBucket: "qchat-f929a.appspot.com",
    messagingSenderId: "159931077018",
    appId: "1:159931077018:web:a2b16370a2fe42269c2a23",
    measurementId: "G-VL53SDZTJ4"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Use Firebase Cloud Messaging (FCM)
const messaging = getMessaging(firebaseApp);

self.addEventListener('install', (event) => {
    // Perform install steps
    console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
    // Perform activate steps
    console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
    // Perform fetch steps
    console.log('Service Worker fetching:', event.request);
});

// Request permission to receive push notifications
Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
        console.log('Notification permission granted.');
    } else {
        console.error('Notification permission denied.');
    }
});

// Retrieve the FCM token and log it
getToken(messaging, { vapidKey: 'BITT96ucSmng0IYstxYa3tF2r7eo6mtjYdohEZKEyu9U7ApFcz1Pqx4T3V8oHg_TlxRWn0vFB2kTxRPIDmNjq6I' })
    .then((currentToken) => {
        if (currentToken) {
            // Send the token to your server for further handling
            console.log('FCM Token:', currentToken);
        } else {
            console.log('No registration token available.');
        }
    })
    .catch((err) => {
        console.error('An error occurred while retrieving token:', err);
    });

// Set up a message listener
onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    // Handle the received message (e.g., show a notification)
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon,
    };

    new Notification(payload.notification.title, notificationOptions);
});