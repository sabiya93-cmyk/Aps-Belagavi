// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCaHjvIQUOF2OtsdIqZp45RCKYTFKh8QwM",
  authDomain: "aps-belagavi.firebaseapp.com",
  projectId: "aps-belagavi",
  storageBucket: "aps-belagavi.firebasestorage.app",
  messagingSenderId: "858834476044",
  appId: "1:858834476044:web:944b457fd2a7b0c0e42229",
  measurementId: "G-B4729784Q4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- DATABASE DEFAULT ---
const defaultUsers = {
    "master": { 
        pass: "master999", role: "Master", name: "System Overlord", 
        quest: "Override Code", ans: "omega-level", voicePass: "activate system" 
    },
    "admin": { 
        pass: "admin123", role: "Admin", name: "Principal System", 
        quest: "Master Key?", ans: "aura-master" 
    },
    "teach1": { pass: "teach123", role: "Teacher", name: "Mr. Sharma", subject: "Math" },
    "stud1": { 
        pass: "stud123", role: "Student", name: "Rahul", 
        stdClass: "10th A", accessCode: "S-101", 
        marks: ["Math: 95"], attendance: 85 
    }
};

let users = {};
let meetingLogs = []; 
let activeMeetingCode = null; 
let currentUser = null;
let realAdmin = null; // Stores original admin when impersonating
let currentView = 'home';
let targetUserForEdit = null;
let editMode = null; 

// --- DATA HANDLING ---
async function loadDatabase() {
    const savedData = localStorage.getItem('auraFlowDB');
    if (savedData) users = JSON.parse(savedData);
    else users = JSON.parse(JSON.stringify(defaultUsers));

    const savedLogs = localStorage.getItem('auraLogs');
    if(savedLogs) meetingLogs = JSON.parse(savedLogs);

    if(db) {
        try {
            const docRef = window.firebaseModules.doc(db, "schoolSystem", "mainData");
            const docSnap = await window.firebaseModules.getDoc(docRef);
            if(docSnap.exists()) {
                users = docSnap.data().users;
                meetingLogs = docSnap.data().logs || [];
                saveLocal(); 
            } else { saveDatabase(); }
        } catch(e) { console.log("Offline"); }
    }
}

async function saveDatabase() { 
    localStorage.setItem('auraFlowDB', JSON.stringify(users));
    localStorage.setItem('auraLogs', JSON.stringify(meetingLogs));
    if(db) {
        try {
            await window.firebaseModules.setDoc(window.firebaseModules.doc(db, "schoolSystem", "mainData"), {
                users: users, logs: meetingLogs
            });
        } catch(e) { console.error("Cloud Error", e); }
    }
}

function saveLocal() {
    localStorage.setItem('auraFlowDB', JSON.stringify(users));
    localStorage.setItem('auraLogs', JSON.stringify(meetingLogs));
}

// --- LOGIN & SECURITY ---
function login() {
    const userIn = document.getElementById('username').value;
    const passIn = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (users[userIn] && users[userIn].pass === passIn) {
        if (users[userIn].role === 'Admin' || users[userIn].role === 'Master') {
            document.getElementById('security-question-text').innerText = users[userIn].quest || "Security Verification";
            document.getElementById('security-modal').classList.remove('hidden');
            tempUser = userIn; // Store temporarily
            errorMsg.style.display = 'none';
        } else {
            currentUser = userIn;
            finalizeLogin();
        }
    } else { errorMsg.style.display = 'block'; }
}

let tempUser = null; 
function verifySecurityAnswer() {
    const ansIn = document.getElementById('security-answer').value;
    if (ansIn === users[tempUser].ans) {
        document.getElementById('security-modal').classList.add('hidden');
        document.getElementById('security-answer').value = ""; 
        currentUser = tempUser;
        tempUser = null;
        
        // Master choice
        if (currentUser === 'master') document.getElementById('master-choice-modal').classList.remove('hidden');
        else finalizeLogin();
        
    } else { document.getElementById('security-error').style.display = 'block'; }
}

function chooseAuth(type) {
    document.getElementById('master-choice-modal').classList.add('hidden');
    if(type === 'voice') document.getElementById('voice-modal').classList.remove('hidden');
    else document.getElementById('override-modal').classList.remove('hidden');
}

function checkOverrideCode() {
    if(document.getElementById('override-code-input').value === users['master'].ans) { 
        document.getElementById('override-modal').classList.add('hidden');
        finalizeLogin();
    } else alert("ACCESS DENIED");
}

function startVoiceListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice API not supported."); return; }
    const recognition = new SpeechRecognition();
    recognition.start();
    recognition.onresult = (e) => {
        if (e.results[0][0].transcript.toLowerCase().includes(users['master'].voicePass)) {
            document.getElementById('voice-modal').classList.add('hidden');
            finalizeLogin();
        } else document.getElementById('voice-status').innerText = "Incorrect.";
    };
}

function finalizeLogin() {
    document.getElementById('login-container').style.display = 'none';
    if(users[currentUser].role === 'Admin' || users[currentUser].role === 'Master') {
        document.getElementById('admin-verify-overlay').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('admin-verify-overlay').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('hidden');
            setupDashboard(currentUser);
        }, 1500);
    } else {
        document.getElementById('main-dashboard').classList.remove('hidden');
        setupDashboard(currentUser);
    }
}

function cancelLogin() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
    tempUser = null;
}

function logout() {
    currentUser = null;
    realAdmin = null;
    currentView = 'home';
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
    // Clear return button
    document.getElementById('admin-controls-header').innerHTML = "";
}

// --- IMPERSONATION ---
function impersonateUser(id) {
    if (!realAdmin) realAdmin = currentUser; // Save admin state
    currentUser = id;
    currentView = 'home';
    alert(`Logging in as ${users[id].name}...`);
    setupDashboard(id);
}

function returnToAdmin() {
    if (realAdmin) {
        currentUser = realAdmin;
        realAdmin = null;
        currentView = 'users'; // Go back to user list
        setupDashboard(currentUser);
    }
}

// --- ADMIN CONTROLS ---
function openEditModal(username, mode) {
    targetUserForEdit = username;
    editMode = mode;
    document.getElementById('modal-title').innerText = mode === 'pass' ? "Change Password" : "Change Access Code";
    document.getElementById('target-user-display').innerText = `Editing: ${users[username].name}`;
    document.getElementById('new-data-input').value = "";
    document.getElementById('password-modal').classList.remove('hidden');
}

function confirmDataChange() {
    const newVal = document.getElementById('new-data-input').value;
    if(!newVal) return alert("Value cannot be empty");
    if(editMode === 'pass') users[targetUserForEdit].pass = newVal;
    else users[targetUserForEdit].accessCode = newVal;
    saveDatabase(); 
    closePassModal();
    setupDashboard(currentUser);
}

function closePassModal() { document.getElementById('password-modal').classList.add('hidden'); targetUserForEdit = null; }

function createNewUser() {
    const id = document.getElementById('new-id').value;
    const pass = document.getElementById('new-pass').value;
    const name = document.getElementById('new-name').value;
    const role = document.getElementById('new-role').value;
    if(!id || !pass) return alert("Fill fields");
    
    let access = role === 'Student' ? "S-" + Math.floor(Math.random()*1000) : "";
    users[id] = { pass: pass, role: role, name: name, marks: [], attendance: 0, accessCode: access };
    saveDatabase();
    alert("Created!");
    setupDashboard(currentUser);
}

function deleteUser(id) { if(confirm("Delete " + id + "?")) { delete users[id]; saveDatabase(); setupDashboard(currentUser); } }

// --- MEETING ---
function createMeeting() { activeMeetingCode = "CLASS-" + Math.floor(1000 + Math.random() * 9000); setupDashboard(currentUser); }
function launchMeeting(code) { if(code) window.open("https://meet.jit.si/" + code, "_blank"); }

function joinMeeting() {
    const codeIn = document.getElementById('join-code').value;
    if (codeIn !== activeMeetingCode) return alert("Invalid Meeting Code");
    if (document.getElementById('join-access').value !== users[currentUser].accessCode) return alert("Invalid Access Code");
    
    meetingLogs.unshift({ student: users[currentUser].name, id: currentUser, classCode: codeIn, loginTime: new Date().toLocaleTimeString(), logoutTime: "Active" });
    saveDatabase(); 
    window.open("https://meet.jit.si/" + codeIn, "_blank");
    setupDashboard(currentUser);
}

function endClass() {
    const logIndex = meetingLogs.findIndex(l => l.id === currentUser && l.logoutTime === "Active");
    if(logIndex !== -1) { meetingLogs[logIndex].logoutTime = new Date().toLocaleTimeString(); saveDatabase(); setupDashboard(currentUser); }
}

function switchView(viewName) { currentView = viewName; setupDashboard(currentUser); }
function getGreeting() { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening"; }
function playWelcomeAudio() { if ('speechSynthesis' in window) { const msg = new SpeechSynthesisUtterance("Welcome to Aura Flow"); window.speechSynthesis.speak(msg); } }

// --- DASHBOARD RENDERER ---
function setupDashboard(userId) {
    const user = users[userId];
    const role = user.role;
    
    // NAV VISIBILITY
    document.querySelectorAll('.menu a').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${currentView}`).classList.add('active');
    
    // Manage Users Link (Admin/Master Only)
    document.getElementById('nav-users').style.display = (role === 'Admin' || role === 'Master') ? 'flex' : 'none';

    // Student Info Link (Hide if Master)
    document.getElementById('nav-info').style.display = (role === 'Master') ? 'none' : 'flex';

    // "Return to Admin" Button (If Impersonating)
    const headerControls = document.getElementById('admin-controls-header');
    if(realAdmin) headerControls.innerHTML = `<button onclick="returnToAdmin()" class="btn-login small" style="background:#FF6584; margin-right:10px;">Return to Admin</button>`;
    else headerControls.innerHTML = "";

    document.getElementById('welcome-header').innerText = `${role} Dashboard`;
    document.getElementById('welcome-message').innerText = `${getGreeting()}, ${user.name}`;
    
    const view = document.getElementById('simple-view');
    view.innerHTML = "";
    
    // === MANAGE USERS VIEW ===
    if(currentView === 'users' && (role === 'Admin' || role === 'Master')) {
        let userListHTML = "";
        for(let u in users) {
            if(u === userId) continue;
            if(u === 'master' && role !== 'Master') continue; // Hide Master from Admin

            let buttons = "";
            
            // 1. LOGIN BUTTON (IMPERSONATION)
            buttons += `<button class="btn-login small" style="background:#6C63FF; margin-right:5px;" onclick="impersonateUser('${u}')" title="Log in as this user"><i class="fas fa-sign-in-alt"></i> Login</button>`;

            // Edit Buttons
            if(users[u].role === 'Teacher' || users[u].role === 'Admin') buttons += `<button class="btn-login small" style="background:#00b894;" onclick="openEditModal('${u}', 'pass')">Pass</button>`;
            if(users[u].role === 'Student') buttons += `<button class="btn-login small" style="background:#fd79a8;" onclick="openEditModal('${u}', 'access')">Access</button>`;
            buttons += `<button class="btn-login small" style="background:#ff4757; margin-left:5px;" onclick="deleteUser('${u}')">Del</button>`;

            userListHTML += `<li style="flex-wrap:wrap;">
                <span style="flex:1;"><b>${users[u].name}</b> (${users[u].role})</span>
                <div style="display:flex; align-items:center;">${buttons}</div>
            </li>`;
        }

        view.innerHTML = `
            <div class="simple-box">
                <h3>Add New User</h3>
                <div class="input-row"><input type="text" id="new-name" placeholder="Name"><input type="text" id="new-id" placeholder="User ID"></div>
                <div class="input-row"><input type="text" id="new-pass" placeholder="Password"><select id="new-role" class="clean-select" style="border:1px solid #ccc;"><option value="Student">Student</option><option value="Teacher">Teacher</option><option value="Admin">Admin</option></select><button class="btn-login small" onclick="createNewUser()">Create</button></div>
            </div>
            <div class="simple-box"><h3>User Database</h3><ul>${userListHTML}</ul></div>
        `;
        return;
    }

    // === MEETING VIEW ===
    if (currentView === 'meeting') {
        if (role === 'Teacher') {
            let codeDisplay = activeMeetingCode ? activeMeetingCode : "No active meeting";
            let startBtn = activeMeetingCode ? `<button class="btn-login" style="background:#00b894;" onclick="launchMeeting('${activeMeetingCode}')">Start</button>` : "";
            view.innerHTML = `<div class="simple-box"><h3>Video Class</h3><button class="btn-login" onclick="createMeeting()">Generate Code</button><div class="meeting-card"><h2>${codeDisplay}</h2>${startBtn}</div></div>`;
        } else if (role === 'Student') {
            const activeLog = meetingLogs.find(l => l.id === currentUser && l.logoutTime === "Active");
            if(activeLog) view.innerHTML = `<div class="simple-box" style="text-align:center;"><h3 style="color:#00b894;">Active: ${activeLog.classCode}</h3><button class="btn-login" style="background:#ff4757;" onclick="endClass()">End Class</button></div>`;
            else view.innerHTML = `<div class="simple-box"><h3>Join Class</h3><input type="text" id="join-code" placeholder="Meeting Code" class="clean-input"><input type="text" id="join-access" placeholder="Access Code" class="clean-input" style="margin-top:10px;"><button class="btn-login" onclick="joinMeeting()" style="margin-top:10px;">Join</button></div>`;
        }
        return;
    }

    // === HOME VIEW ===
    if (role === 'Master') {
        let logsHTML = meetingLogs.length ? "" : "<p>No activity.</p>";
        meetingLogs.forEach(l => {
            let status = l.logoutTime === "Active" ? "<b style='color:#00b894'>Active</b>" : `Out: ${l.logoutTime}`;
            logsHTML += `<div class="log-entry"><b>${l.student}</b> [${l.classCode}] <br> In: ${l.loginTime} | ${status}</div>`;
        });
        view.innerHTML = `<div class="simple-box"><h3>🕵️ Live Class Logs</h3><div class="notification-box">${logsHTML}</div></div>`;
    }
    else if (role === 'Student') {
        view.innerHTML = `<div class="simple-box"><h3>My Status</h3><p>Access Code: <b>${user.accessCode}</b></p><p>Attendance: ${user.attendance}%</p></div>`;
    }
    else view.innerHTML = `<div class="simple-box"><h3>Welcome</h3><p>Select an option from the menu.</p></div>`;
}
