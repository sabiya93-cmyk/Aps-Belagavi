// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCaHjvIQUOF2OtsdIqZp45RCKYTFKh8QwM",
  authDomain: "aps-belagavi.firebaseapp.com",
  projectId: "aps-belagavi",
  storageBucket: "aps-belagavi.appspot.com",
  messagingSenderId: "858834476044",
  appId: "1:858834476044:web:944b457fd2a7b0c0e42229",
  measurementId: "G-B4729784Q4"
};

// --- INITIALIZATION ---
let app, db, analytics;
window.addEventListener("DOMContentLoaded", async () => {
  if (window.firebaseModules) {
    app = window.firebaseModules.initializeApp(firebaseConfig);
    db = window.firebaseModules.getFirestore(app);
    analytics = window.firebaseModules.getAnalytics(app);
  }
});

// --- GLOBAL VARIABLES ---
let users = {};
let meetingLogs = [];
let activeMeetingCode = null;
let currentUser = null;
let realAdmin = null;
let currentView = "home";
let tempUser = null;
let targetUserForEdit = null;
let editMode = null;

// --- DEFAULT USERS ---
const defaultUsers = {
  master: { pass: "master999", role: "Master", name: "System Overlord", quest: "Override Code", ans: "omega-level", voicePass: "activate system" },
  admin: { pass: "admin123", role: "Admin", name: "Principal System", quest: "Master Key?", ans: "aura-master" },
  teach1: { pass: "teach123", role: "Teacher", name: "Mr. Sharma", subject: "Math" },
  stud1: { pass: "stud123", role: "Student", name: "Rahul", stdClass: "10th A", accessCode: "S-101", marks: ["Math: 95"], attendance: 85 }
};

// --- BOOT SCREEN HANDLER ---
window.addEventListener("load", () => {
  const boot = document.getElementById("boot-screen");
  setTimeout(() => {
    boot.classList.add("fade-out");
    setTimeout(() => {
      boot.style.display = "none";
      document.getElementById("login-container").classList.remove("hidden");
      loadDatabase();
    }, 1000);
  }, 1500);
});

// --- LOCAL DATABASE / FIREBASE SYNC ---
async function loadDatabase() {
  const savedUsers = localStorage.getItem("auraFlowDB");
  users = savedUsers ? JSON.parse(savedUsers) : { ...defaultUsers };

  const savedLogs = localStorage.getItem("auraLogs");
  meetingLogs = savedLogs ? JSON.parse(savedLogs) : [];

  try {
    if (!db) return; // skip if Firebase not initialized
    const docRef = window.firebaseModules.doc(db, "schoolSystem", "mainData");
    const docSnap = await window.firebaseModules.getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      users = data.users || users;
      meetingLogs = data.logs || meetingLogs;
      saveLocal();
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.warn("Firebase offline or permission denied");
  }
}

async function saveDatabase() {
  saveLocal();
  try {
    if (db) {
      await window.firebaseModules.setDoc(
        window.firebaseModules.doc(db, "schoolSystem", "mainData"),
        { users, logs: meetingLogs }
      );
    }
  } catch (err) {
    console.error("Cloud Error:", err);
  }
}

function saveLocal() {
  localStorage.setItem("auraFlowDB", JSON.stringify(users));
  localStorage.setItem("auraLogs", JSON.stringify(meetingLogs));
}

// --- LOGIN / SECURITY ---
function login() {
  const userIn = document.getElementById("username").value.trim();
  const passIn = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("login-error");

  if (users[userIn] && users[userIn].pass === passIn) {
    errorMsg.style.display = "none";
    currentUser = userIn;
    finalizeLogin();
  } else {
    errorMsg.style.display = "block";
  }
}

function finalizeLogin() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("main-dashboard").classList.remove("hidden");
  setupDashboard(currentUser);
}

function logout() {
  currentUser = null;
  realAdmin = null;
  currentView = "home";
  document.getElementById("main-dashboard").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

// --- VIEW SWITCHER ---
function switchView(view) {
  document.querySelectorAll(".menu a").forEach(a => a.classList.remove("active"));
  document.getElementById("nav-" + view).classList.add("active");
  currentView = view;
  setupDashboard(currentUser);
}

// --- DASHBOARD SETUP ---
function setupDashboard(userId) {
  const user = users[userId];
  const role = user.role;
  document.getElementById("welcome-header").innerText = `${role} Dashboard`;
  document.getElementById("welcome-message").innerText = `Hello, ${user.name}`;

  const view = document.getElementById("simple-view");
  view.innerHTML = "";

  // Sidebar control
  document.getElementById("nav-users").style.display = (role === "Admin" || role === "Master") ? "flex" : "none";
  document.getElementById("nav-info").style.display = role === "Master" ? "none" : "flex";

  // --- USERS VIEW ---
  if (currentView === "users" && (role === "Admin" || role === "Master")) {
    let userListHTML = "";
    for (let u in users) {
      if (u === "master" && role !== "Master") continue;
      let buttons = `<button class="btn-login small" onclick="impersonateUser('${u}')">Login</button>`;
      if (users[u].role === "Teacher" || users[u].role === "Admin")
        buttons += `<button class="btn-login small" onclick="openEditModal('${u}','pass')">Pass</button>`;
      if (users[u].role === "Student")
        buttons += `<button class="btn-login small" onclick="openEditModal('${u}','access')">Access</button>`;
      buttons += `<button class="btn-login small" style="background:#ff4757;" onclick="deleteUser('${u}')">Del</button>`;
      userListHTML += `<li style="display:flex; justify-content:space-between;">${users[u].name} (${users[u].role}) <span>${buttons}</span></li>`;
    }

    view.innerHTML = `
      <div class="simple-box">
        <h3>Add New User</h3>
        <input type="text" id="new-name" placeholder="Name">
        <input type="text" id="new-id" placeholder="User ID">
        <input type="text" id="new-pass" placeholder="Password">
        <select id="new-role">
          <option>Student</option>
          <option>Teacher</option>
          <option>Admin</option>
        </select>
        <button onclick="createNewUser()">Create</button>
        <hr style="margin:20px 0; opacity:0.3;">
      </div>
      <div class="simple-box"><h3>User Database</h3><ul>${userListHTML}</ul></div>
    `;
    return;
  }

  // --- STUDENT INFO ---
  if (currentView === "info") {
    let html = "<div class='simple-box'><h3>Student Info</h3><ul>";
    for (let u in users)
      if (users[u].role === "Student")
        html += `<li>${users[u].name} - Attendance: ${users[u].attendance || 0}% - Access: ${users[u].accessCode || "N/A"}</li>`;
    html += "</ul></div>";
    view.innerHTML = html;
    return;
  }

  // --- MEETING ---
  if (currentView === "meeting") {
    if (role === "Teacher") {
      let codeDisplay = activeMeetingCode || "No active meeting";
      let startBtn = activeMeetingCode ? `<button onclick="launchMeeting('${activeMeetingCode}')">Start</button>` : "";
      view.innerHTML = `<div class="simple-box"><h3>Video Class</h3><button onclick="createMeeting()">Generate Code</button><div>${codeDisplay}${startBtn}</div></div>`;
    } else if (role === "Student") {
      const activeLog = meetingLogs.find(l => l.id === currentUser && l.logoutTime === "Active");
      if (activeLog)
        view.innerHTML = `<div class="simple-box"><h3>Active: ${activeLog.classCode}</h3><button onclick="endClass()">End Class</button></div>`;
      else
        view.innerHTML = `<div class="simple-box"><h3>Join Class</h3><input id="join-code" placeholder="Meeting Code"><input id="join-access" placeholder="Access Code"><button onclick="joinMeeting()">Join</button></div>`;
    }
    return;
  }

  // --- HOME ---
  view.innerHTML = `<div class="simple-box"><h3>Welcome to AuraFlow</h3><p>Select a section from the sidebar.</p></div>`;
}

// --- ADMIN FUNCTIONS ---
function createNewUser() {
  const id = document.getElementById("new-id").value.trim();
  const pass = document.getElementById("new-pass").value.trim();
  const name = document.getElementById("new-name").value.trim();
  const role = document.getElementById("new-role").value.trim();

  if (!id || !pass || !name) return alert("All fields required.");
  let access = role === "Student" ? "S-" + Math.floor(Math.random() * 1000) : "";

  users[id] = { pass, role, name, marks: [], attendance: 0, accessCode: access };
  saveDatabase();
  alert("User created!");
  setupDashboard(currentUser);
}

function deleteUser(id) {
  if (confirm(`Delete ${id}?`)) {
    delete users[id];
    saveDatabase();
    setupDashboard(currentUser);
  }
}

// --- MEETING HANDLERS ---
function createMeeting() {
  activeMeetingCode = "CLASS-" + Math.floor(1000 + Math.random() * 9000);
  setupDashboard(currentUser);
}

function launchMeeting(code) {
  if (code) window.open("https://meet.jit.si/" + code, "_blank");
}

function joinMeeting() {
  const codeIn = document.getElementById("join-code").value.trim();
  const accessIn = document.getElementById("join-access").value.trim();
  if (codeIn !== activeMeetingCode) return alert("Invalid Meeting Code");
  if (accessIn !== users[currentUser].accessCode) return alert("Invalid Access Code");

  meetingLogs.unshift({
    student: users[currentUser].name,
    id: currentUser,
    classCode: codeIn,
    loginTime: new Date().toLocaleTimeString(),
    logoutTime: "Active"
  });
  saveDatabase();
  window.open("https://meet.jit.si/" + codeIn, "_blank");
  setupDashboard(currentUser);
}

function endClass() {
  const logIndex = meetingLogs.findIndex(l => l.id === currentUser && l.logoutTime === "Active");
  if (logIndex !== -1) {
    meetingLogs[logIndex].logoutTime = new Date().toLocaleTimeString();
    saveDatabase();
    setupDashboard(currentUser);
  }
}

// --- IMPERSONATION ---
function impersonateUser(id) {
  if (!realAdmin) realAdmin = currentUser;
  currentUser = id;
  alert(`Logged in as ${users[id].name}`);
  setupDashboard(id);
}
