// chat.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, collection, where, query, addDoc, onSnapshot, orderBy, updateDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Your Firebase configuration
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
const app = initializeApp(firebaseConfig);

// Use Firebase Auth
const auth = getAuth(app);

// Use Firebase Firestore
const firestore = getFirestore(app);

// Get elements
const chatUserElement = document.getElementById('chatUser');
const chatMessagesElement = document.getElementById('chatMessages');
const messageInputElement = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

// Variable to store the currently selected user and unsubscribe function
let currentChatUser = null;

// Function to update chat content for a specific user
function updateChat(currentUserUID, otherUserUID) {
    const email = urlParams.get('email');
    // Set the chat user
    chatUserElement.textContent = `${email}`;

    // Fetch and display messages for the selected user from Firestore
    const messagesCollection = collection(firestore, 'messages');
    const messagesQuery = query(
        messagesCollection,
        where('sender', 'in', [currentUserUID, otherUserUID]),
        orderBy('timestamp'),
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        chatMessagesElement.innerHTML = ''; // Clear previous messages
        querySnapshot.forEach(async (doc) => {
            const message = doc.data();
            const messageElement = document.createElement('div');
            messageElement.textContent = `${message.email}: ${message.text}`;
            chatMessagesElement.appendChild(messageElement);
            // Check if the message has been shown
            if (message.status !== 'showed' && message.sender !== currentUserUID) {
                // Show notification only if the message is not marked as 'showed' and not sent by the current user
                showNotification(message.email, message.text);

                // Update the message status to 'showed'
                await updateDoc(doc.ref, {
                    status: 'showed'
                });
            }
            // Function to show a notification
            function showNotification(senderEmail, messageText) {
                // You can customize the notification options
                const notificationOptions = {
                    body: `${senderEmail}: ${messageText}`,
                    icon: 'path/to/notification-icon.png', // Replace with the path to your notification icon
                };

                new Notification('New Message', notificationOptions);
            }
        });
    });

    // Save the unsubscribe function to stop listening when needed
    currentChatUser = { currentUserUID, otherUserUID, unsubscribe };
}

// Extract the currentUserUID and otherUserUID from the URL
const urlParams = new URLSearchParams(window.location.search);
const currentUserUID = urlParams.get('currentUserUID');
const otherUserUID = urlParams.get('otherUserUID');

// Check if currentUserUID and otherUserUID are available
if (currentUserUID && otherUserUID) {
    // Call updateChat with the extracted UIDs
    updateChat(currentUserUID, otherUserUID);

    // Add send message functionality
    sendMessageBtn.addEventListener('click', () => {
        const messageText = messageInputElement.value.trim();
        if (messageText !== '') {
            const messagesCollection = collection(firestore, 'messages');
            const email = localStorage.getItem('email');

            // You need to adjust the structure of the message data based on your needs
            const messageData = {
                sender: currentUserUID,
                receiver: otherUserUID,
                senderName: currentUserUID, // Replace with the actual display name
                text: messageText,
                timestamp: new Date(),
                email: email,
            };

            addDoc(messagesCollection, messageData)
                .then(() => {
                    // Message sent successfully, update the chat
                    updateChat(currentUserUID, otherUserUID);
                    messageInputElement.value = ''; // Clear the input field
                })
                .catch((error) => {
                    console.error("Error sending message:", error);
                });
        }
    });
} else {
    // Redirect to index.html if UIDs are not available
    window.location.href = 'index.html';
}

// Optional: Check if the user is signed in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // User is not signed in, redirect to index.html
        console.log("User is not signed in. Redirecting to index.html.");
        window.location.href = 'index.html';
    }
});