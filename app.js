// Import Firebase SDKs (Removed Storage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- YOUR CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDrCDjT300X6DqVy39doeIEI4bd3x_t5b0",
  authDomain: "team-mutholi.firebaseapp.com",
  projectId: "team-mutholi",
  // storageBucket is no longer needed
  messagingSenderId: "926229694596",
  appId: "1:926229694596:web:5bea3e17828d02169cdad1",
  measurementId: "G-98DV8W2MXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    onboarding: document.getElementById('onboarding-view'),
    dashboard: document.getElementById('dashboard-view')
};

const adminEmail = "alfinphilip75@gmail.com";

// --- AUTHENTICATION ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User logged in. Check if they have set up their profile (DOB/Phone)
        const docRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                showView('dashboard');
                loadDashboard(user, docSnap.data());
            } else {
                showView('onboarding');
            }
        } catch (e) {
            console.error("Error fetching profile:", e);
        }
    } else {
        showView('login');
    }
});

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch(err => alert("Login Failed: " + err.message));
});

// Register
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    
    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => alert("Account created! Please add your details."))
        .catch(err => alert("Registration Failed: " + err.message));
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.reload());
});


// --- ONBOARDING (Simplified) ---

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ob-submit-btn');
    btn.textContent = "Saving...";
    btn.disabled = true;

    const user = auth.currentUser;
    const dob = document.getElementById('ob-dob').value;
    const phone = document.getElementById('ob-phone').value;

    try {
        // Save User Data to Firestore (Auto Verified)
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            dob: dob,
            phone: phone,
            verified: true, // AUTO-VERIFY everyone
            isAdmin: user.email === adminEmail,
            joinedAt: serverTimestamp()
        });

        location.reload(); 

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        btn.textContent = "Save & Enter";
        btn.disabled = false;
    }
});

// --- DASHBOARD LOGIC ---

function loadDashboard(user, userData) {
    // 1. Hide the "Verification Status" box if it exists in HTML
    const statusBox = document.getElementById('verification-status');
    if(statusBox) statusBox.style.display = 'none';

    // 2. Check Birthday
    checkBirthday(userData.dob);

    // 3. Admin Controls
    if (userData.isAdmin) {
        const btn = document.getElementById('new-announcement-btn');
        if(btn) btn.classList.remove('hidden');
    }

    // 4. Load Announcements
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const feed = document.getElementById('announcements-feed');
        feed.innerHTML = "";
        
        snapshot.forEach(doc => {
            const data = doc.data();
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
    
    if (today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()) {
        const banner = document.getElementById('birthday-banner');
        if(banner) {
            banner.classList.remove('hidden');
            document.getElementById('bday-msg').innerText = `Happy Birthday! 🎉`; 
        }
    }
}

// --- ADMIN FEATURES ---

const modal = document.getElementById('admin-modal');
const newPostBtn = document.getElementById('new-announcement-btn');
const closeBtn = document.querySelector('.close-modal');

if(newPostBtn) newPostBtn.onclick = () => modal.classList.remove('hidden');
if(closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

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

// --- VIEW UTILS ---
function showView(viewId) {
    Object.values(views).forEach(el => { if(el) el.classList.remove('active'); });
    if(views[viewId]) views[viewId].classList.add('active');
    
    // Toggle Login/Register Forms
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
