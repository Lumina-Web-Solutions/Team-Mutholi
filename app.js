// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDrCDjT300X6DqVy39doeIEI4bd3x_t5b0",
  authDomain: "team-mutholi.firebaseapp.com",
  projectId: "team-mutholi",
  messagingSenderId: "926229694596",
  appId: "1:926229694596:web:5bea3e17828d02169cdad1",
  measurementId: "G-98DV8W2MXX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const adminEmail = "alfinphilip75@gmail.com";

// --- VIEW MANAGEMENT ---
const views = {
    login: document.getElementById('login-view'),
    onboarding: document.getElementById('onboarding-view'),
    dashboard: document.getElementById('dashboard-view')
};

function showView(viewId) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewId].classList.add('active');
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check Profile
        const docRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                initDashboard(user, docSnap.data());
                showView('dashboard');
            } else {
                showView('onboarding');
            }
        } catch (e) { console.error(e); }
    } else {
        showView('login');
    }
});

// Login & Register Logic
document.getElementById('show-register').onclick = () => { document.getElementById('register-card').classList.remove('hidden'); document.querySelector('.login-card').classList.add('hidden'); };
document.getElementById('show-login').onclick = () => { document.getElementById('register-card').classList.add('hidden'); document.querySelector('.login-card').classList.remove('hidden'); };

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value)
        .catch(err => alert(err.message));
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, document.getElementById('reg-email').value, document.getElementById('reg-password').value)
        .catch(err => alert(err.message));
});

document.getElementById('logout-btn').onclick = () => signOut(auth).then(()=>location.reload());

// --- ONBOARDING & IMAGE UPLOAD ---
// Using ImgBB API for free image hosting (Simple, no backend config needed)
const IMGBB_API_KEY = "6d207e02198a847aa98d0a2a901485a5"; // Replace with your own key if needed

async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    
    let response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
    
    let data = await response.json();
    return data.data.url;
}

// Preview Profile Image
document.getElementById('ob-file').onchange = (e) => {
    const file = e.target.files[0];
    if (file) document.getElementById('profile-preview').src = URL.createObjectURL(file);
};

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ob-submit-btn');
    btn.textContent = "Uploading...";
    btn.disabled = true;

    try {
        const user = auth.currentUser;
        const file = document.getElementById('ob-file').files[0];
        let photoUrl = `https://ui-avatars.com/api/?name=${document.getElementById('ob-name').value}`;

        if (file) {
            photoUrl = await uploadImage(file);
        }

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            name: document.getElementById('ob-name').value,
            dob: document.getElementById('ob-dob').value,
            phone: document.getElementById('ob-phone').value,
            photo: photoUrl,
            isAdmin: user.email === adminEmail,
            joinedAt: serverTimestamp()
        });
        location.reload();
    } catch (err) { alert("Error: " + err.message); btn.disabled = false; }
});

// --- DASHBOARD LOGIC ---
let currentUserData = null;

function initDashboard(user, data) {
    currentUserData = data;
    document.getElementById('dash-username').textContent = data.name;
    document.getElementById('dash-avatar').src = data.photo;
    
    // Check Birthday
    const today = new Date();
    const dob = new Date(data.dob);
    if(today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()) {
        document.getElementById('birthday-banner').classList.remove('hidden');
    }

    // Admin Buttons
    if(data.isAdmin) {
        document.getElementById('add-anno-btn').classList.remove('hidden');
        document.getElementById('add-event-btn').classList.remove('hidden');
    }

    loadFeed();
}

// --- TABS SWITCHING ---
window.switchTab = (tabName) => {
    // Buttons
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Content
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Load Data
    if(tabName === 'members') loadMembers();
    if(tabName === 'gallery') loadGallery();
    if(tabName === 'events') loadEvents();
};

// --- FEATURES ---

// 1. FEED
function loadFeed() {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('feed-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
            <div class="card-post">
                <p>${d.text}</p>
                <div class="card-meta">${d.dateString}</div>
            </div>`;
        });
    });
}

// 2. MEMBERS
async function loadMembers() {
    const list = document.getElementById('members-grid');
    if(list.innerHTML.trim() !== "") return; // Don't reload if present

    const snap = await getDocs(query(collection(db, "users")));
    list.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `
        <div class="member-card">
            <img src="${d.photo}" alt="${d.name}">
            <h4>${d.name}</h4>
            <p>${d.phone}</p>
        </div>`;
    });
}

// 3. GALLERY
function loadGallery() {
    const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('gallery-grid');
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
            <div class="gallery-item">
                <img src="${d.url}" onclick="window.open(this.src)">
                ${d.caption ? `<div class="gallery-caption">${d.caption}</div>` : ''}
            </div>`;
        });
    });
}

// 4. EVENTS
function loadEvents() {
    const q = query(collection(db, "events"), orderBy("fullDate", "asc"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('events-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
            <div class="card-post" style="border-left-color: #667eea;">
                <h4>${d.title}</h4>
                <div class="card-meta"><i class="fa-regular fa-clock"></i> ${d.date} @ ${d.time}</div>
                <div class="card-meta"><i class="fa-solid fa-location-dot"></i> ${d.location}</div>
            </div>`;
        });
    });
}

// --- MODALS & ACTIONS ---

// Helpers
const toggleModal = (id, show) => document.getElementById(id).classList.toggle('hidden', !show);
document.querySelectorAll('.close-modal').forEach(b => b.onclick = (e) => toggleModal(e.target.closest('.modal').id, false));

// Post
document.getElementById('add-anno-btn').onclick = () => toggleModal('post-modal', true);
document.getElementById('submit-post').onclick = async () => {
    const text = document.getElementById('post-text').value;
    if(!text) return;
    await addDoc(collection(db, "announcements"), {
        text, timestamp: serverTimestamp(), dateString: new Date().toLocaleDateString()
    });
    toggleModal('post-modal', false); document.getElementById('post-text').value = "";
};

// Event
document.getElementById('add-event-btn').onclick = () => toggleModal('event-modal', true);
document.getElementById('submit-event').onclick = async () => {
    const title = document.getElementById('evt-title').value;
    const date = document.getElementById('evt-date').value;
    const time = document.getElementById('evt-time').value;
    const loc = document.getElementById('evt-loc').value;
    await addDoc(collection(db, "events"), {
        title, date, time, location: loc, fullDate: new Date(`${date}T${time}`), createdBy: auth.currentUser.email
    });
    toggleModal('event-modal', false);
};

// Gallery Upload
document.getElementById('upload-photo-btn').onclick = () => toggleModal('photo-modal', true);
document.getElementById('submit-photo').onclick = async () => {
    const file = document.getElementById('gallery-file').files[0];
    const cap = document.getElementById('gallery-caption').value;
    const btn = document.getElementById('submit-photo');
    
    if(!file) return;
    btn.innerText = "Uploading...";
    
    try {
        const url = await uploadImage(file);
        await addDoc(collection(db, "gallery"), {
            url, caption: cap, timestamp: serverTimestamp(), user: auth.currentUser.email
        });
        toggleModal('photo-modal', false);
    } catch(e) { alert(e); }
    btn.innerText = "Upload";
};
