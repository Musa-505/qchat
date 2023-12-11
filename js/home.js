// home.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, collection, getDocs, where, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Your web app's Firebase configuration
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

const userInfoElement = document.getElementById('userInfo');
const userListElement = document.getElementById('userList');
const signOutBtn = document.getElementById('signOutBtn');

// Function to show a notification
function showNotification(senderEmail, messageText) {
    // You can customize the notification options
    const notificationOptions = {
        body: `${senderEmail}: ${messageText}`,
        icon: 'path/to/notification-icon.png', // Replace with the path to your notification icon
    };

    new Notification('New Message', notificationOptions);
}

let currentChatUser = null;

// Check if the user is signed in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);

        // Display user information on the page
        userInfoElement.textContent = `Welcome, ${user.email}`;

        // Fetch and display users from Firestore
        const usersCollection = collection(firestore, 'users');

        function updateChat(currentUserUID, otherUserUID) {
            // Fetch and display messages for the selected user from Firestore
            const messagesCollection = collection(firestore, 'messages');
            const messagesQuery = query(
                messagesCollection,
                where('sender', 'in', [currentUserUID, otherUserUID]),
                orderBy('timestamp'),
            );
            // Listen for real-time updates
            const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
                querySnapshot.forEach(async (doc) => {
                    const message = doc.data();
                    // const showed = (doc.data().status)
                    // if (showed === "noshowed") {
                    //     const noshowedMessages = [];
                    //     noshowedMessages.push(showed);
                    //     console.log(noshowedMessages.length)
                    // }
                    // Check if the message has been shown
                    if (message.status !== 'showed' && message.sender !== currentUserUID) {
                        // Show notification only if the message is not marked as 'showed' and not sent by the current user
                        showNotification(message.email, message.text);
                    }
                });
            });

            // Save the unsubscribe function to stop listening when needed
            currentChatUser = { currentUserUID, otherUserUID, unsubscribe };
        }

        const q = query(usersCollection, where('email', '!=', user.email));
        getDocs(q)
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    const user = doc.data();
                    const listItem = document.createElement('li');
                    listItem.textContent = `User: ${user.name}, Email: ${user.email}`;
                    userListElement.appendChild(listItem);
                    const currentUserUID = localStorage.getItem('user');
                    updateChat(currentUserUID, user.uid);

                    // Add click event listener to each user item
                    listItem.addEventListener('click', () => {
                        // Redirect to chat.html with the current user's UID and the clicked user's UID as parameters
                        window.location.href = `chat.html?currentUserUID=${currentUserUID}&otherUserUID=${user.uid}&email=${user.email}`;
                    });
                });
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });

        // Add sign-out functionality
        signOutBtn.addEventListener('click', () => {
            // Sign out the user
            signOut(auth).then(() => {
                console.log("User signed out.");
                // Redirect to the index.html page after sign-out
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Sign-out error:", error);
            });
        });
    } else {
        // User is not signed in, redirect to index.html
        console.log("User is not signed in. Redirecting to index.html.");
        window.location.href = 'index.html';
    }
});