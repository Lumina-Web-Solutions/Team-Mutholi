// Import Firebase SDKs from CDN (Browser Compatible)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- YOUR CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDrCDjT300X6DqVy39doeIEI4bd3x_t5b0",
  authDomain: "team-mutholi.firebaseapp.com",
  projectId: "team-mutholi",
  storageBucket: "team-mutholi.firebasestorage.app", // Fixed bucket URL format
  messagingSenderId: "926229694596",
  appId: "1:926229694596:web:5bea3e17828d02169cdad1",
  measurementId: "G-98DV8W2MXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    onboarding: document.getElementById('onboarding-view'),
    dashboard: document.getElementById('dashboard-view')
};

const adminEmail = "alfinphilip75@gmail.com";

// --- AUTHENTICATION ---

// Monitor Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check if profile is complete in Firestore
        const docRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Profile exists, go to Dashboard
                showView('dashboard');
                loadDashboard(user, docSnap.data());
            } else {
                // No profile data yet, go to Onboarding
                showView('onboarding');
            }
        } catch (e) {
            console.error("Error fetching user profile:", e);
            // If error, likely permission issue or network. Stay on login or show error.
        }
    } else {
        // No user, go to Login
        showView('login');
    }
});

// Login Function
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch(err => alert("Login Failed: " + err.message));
});

// Register Function
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    // We don't save name yet, we save it in onboarding
    
    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => {
            alert("Account created! Please complete verification.");
        })
        .catch(err => alert("Registration Failed: " + err.message));
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.reload());
});


// --- ONBOARDING (Profile Setup) ---

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ob-submit-btn');
    const originalText = btn.textContent;
    btn.textContent = "Uploading ID... Please Wait";
    btn.disabled = true;

    const user = auth.currentUser;
    const dob = document.getElementById('ob-dob').value;
    const phone = document.getElementById('ob-phone').value;
    const file = document.getElementById('ob-idcard').files[0];

    // Basic Validation
    if(!file) {
        alert("Please upload an ID card.");
        btn.textContent = originalText;
        btn.disabled = false;
        return;
    }

    try {
        // 1. Upload ID Card to Storage
        // Naming convention: uid_filename to avoid conflicts
        const storageRef = ref(storage, `id_cards/${user.uid}_${file.name}`);
        await uploadBytes(storageRef, file);
        const idUrl = await getDownloadURL(storageRef);

        // 2. Save User Data to Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            dob: dob,
            phone: phone,
            idCardUrl: idUrl,
            verified: false, // Default to false until You (Admin) approve it
            isAdmin: user.email === adminEmail,
            joinedAt: serverTimestamp()
        });

        // 3. Reload to trigger the dashboard logic
        location.reload(); 

    } catch (error) {
        console.error(error);
        alert("Error during setup: " + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// --- DASHBOARD LOGIC ---

function loadDashboard(user, userData) {
    // 1. Check Verification Status
    const statusBox = document.getElementById('verification-status');
    const isAdmin = (user.email === adminEmail);

    if (userData.verified || isAdmin) {
        statusBox.style.display = 'none'; // Hide warning if verified
    } else {
        statusBox.style.display = 'block'; // Show warning
        statusBox.innerHTML = "<strong>Access Restricted:</strong> Your ID is under review by the Admin.";
    }

    // 2. Check Birthday
    checkBirthday(userData.dob);

    // 3. Admin Controls (Only show if email matches alfinphilip75@gmail.com)
    if (isAdmin) {
        document.getElementById('new-announcement-btn').classList.remove('hidden');
    }

    // 4. Load Announcements
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    
    // Real-time listener
    onSnapshot(q, (snapshot) => {
        const feed = document.getElementById('announcements-feed');
        feed.innerHTML = "";
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to readable date
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            
            const html = `
                <div class="announcement-item">
                    <p>${data.text}</p>
                    <div class="meta">Posted on ${date}</div>
                </div>
            `;
            feed.innerHTML += html;
        });

        if(snapshot.empty) {
            feed.innerHTML = "<p style='text-align:center; color:#888;'>No announcements yet.</p>";
        }
    });
}

function checkBirthday(dobString) {
    if(!dobString) return;

    const today = new Date();
    const dob = new Date(dobString);
    
    // Compare Month and Date
    if (today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()) {
        const banner = document.getElementById('birthday-banner');
        banner.classList.remove('hidden');
        document.getElementById('bday-msg').innerText = `Happy Birthday, Alfin! 🎉 (Example)`; 
        // Note: You can customize this to use their Name if you added a name field
    }
}

// --- ADMIN FEATURES ---

// Modal Logic
const modal = document.getElementById('admin-modal');
const newPostBtn = document.getElementById('new-announcement-btn');
const closeBtn = document.querySelector('.close-modal');

if(newPostBtn) newPostBtn.onclick = () => modal.classList.remove('hidden');
if(closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

// Post Announcement
document.getElementById('post-announcement-btn').onclick = async () => {
    const text = document.getElementById('announcement-text').value;
    if (!text) return;

    try {
        await addDoc(collection(db, "announcements"), {
            text: text,
            timestamp: serverTimestamp(),
            author: auth.currentUser.email
        });
        
        document.getElementById('announcement-text').value = "";
        modal.classList.add('hidden');
    } catch (e) {
        alert("Error posting: " + e.message);
    }
};

// --- VIEW NAVIGATION UTILS ---
function showView(viewId) {
    // Hide all views
    Object.values(views).forEach(el => {
        if(el) el.classList.remove('active');
    });
    // Show target view
    if(views[viewId]) views[viewId].classList.add('active');
    
    // Toggle Login/Register Forms inside Login View
    const registerCard = document.getElementById('register-card');
    const loginCard = document.querySelector('.login-card:not(#register-card)');
    
    if(viewId === 'login') {
        document.getElementById('show-register').onclick = (e) => {
            e.preventDefault();
            loginCard.classList.add('hidden');
            registerCard.classList.remove('hidden');
        };
        document.getElementById('show-login').onclick = (e) => {
            e.preventDefault();
            registerCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
        };
    }
}

