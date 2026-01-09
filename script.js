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

// Initialize Firebase
const app = window.firebaseModules.initializeApp(firebaseConfig);
const db = window.firebaseModules.getFirestore(app);
const analytics = window.firebaseModules.getAnalytics(app);

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

// --- BOOT SCREEN + LOAD DATABASE ---
window.addEventListener("load", () => {
  setTimeout(() => {
    const boot = document.getElementById("boot-screen");
    if (boot) boot.classList.add("fade-out");
    loadDatabase();
  }, 1200);
});

async function loadDatabase() {
  const savedUsers = localStorage.getItem("auraFlowDB");
  users = savedUsers ? JSON.parse(savedUsers) : { ...defaultUsers };

  const savedLogs = localStorage.getItem("auraLogs");
  meetingLogs = savedLogs ? JSON.parse(savedLogs) : [];

  try {
    const docRef = window.firebaseModules.doc(db, "schoolSystem", "mainData");
    const docSnap = await window.firebaseModules.getDoc(docRef);
    if (docSnap.exists()) {
      users = docSnap.data().users;
      meetingLogs = docSnap.data().logs || [];
      saveLocal();
    } else saveDatabase();
  } catch (err) {
    console.log("Firebase offline or permission denied");
  }
}

async function saveDatabase() {
  localStorage.setItem("auraFlowDB", JSON.stringify(users));
  localStorage.setItem("auraLogs", JSON.stringify(meetingLogs));
  try {
    await window.firebaseModules.setDoc(window.firebaseModules.doc(db, "schoolSystem", "mainData"), {
      users, logs: meetingLogs
    });
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
  const userIn = document.getElementById("username").value;
  const passIn = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");

  if (users[userIn] && users[userIn].pass === passIn) {
    if (users[userIn].role === "Admin" || users[userIn].role === "Master") {
      document.getElementById("security-question-text").innerText = users[userIn].quest;
      document.getElementById("security-modal").classList.remove("hidden");
      tempUser = userIn;
      errorMsg.style.display = "none";
    } else {
      currentUser = userIn;
      finalizeLogin();
    }
  } else {
    errorMsg.style.display = "block";
  }
}

function verifySecurityAnswer() {
  const ansIn = document.getElementById("security-answer").value;
  if (ansIn === users[tempUser].ans) {
    document.getElementById("security-modal").classList.add("hidden");
    currentUser = tempUser;
    tempUser = null;

    if (currentUser === "master") {
      document.getElementById("master-choice-modal").classList.remove("hidden");
    } else finalizeLogin();
  } else {
    document.getElementById("security-error").style.display = "block";
  }
}

function chooseAuth(type) {
  document.getElementById("master-choice-modal").classList.add("hidden");
  if (type === "voice") document.getElementById("voice-modal").classList.remove("hidden");
  else document.getElementById("override-modal").classList.remove("hidden");
}

function checkOverrideCode() {
  if (document.getElementById("override-code-input").value === users["master"].ans) {
    document.getElementById("override-modal").classList.add("hidden");
    finalizeLogin();
  } else alert("ACCESS DENIED");
}

function startVoiceListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Voice API not supported."); return; }
  const recognition = new SpeechRecognition();
  recognition.start();
  recognition.onresult = (e) => {
    if (e.results[0][0].transcript.toLowerCase().includes(users["master"].voicePass)) {
      document.getElementById("voice-modal").classList.add("hidden");
      finalizeLogin();
    } else document.getElementById("voice-status").innerText = "Incorrect.";
  };
}

function finalizeLogin() {
  document.getElementById("login-container").style.display = "none";
  if (users[currentUser].role === "Admin" || users[currentUser].role === "Master") {
    document.getElementById("admin-verify-overlay").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("admin-verify-overlay").classList.add("hidden");
      document.getElementById("main-dashboard").classList.remove("hidden");
      setupDashboard(currentUser);
    }, 1200);
  } else {
    document.getElementById("main-dashboard").classList.remove("hidden");
    setupDashboard(currentUser);
  }
}

function cancelLogin() {
  document.querySelectorAll(".modal-overlay").forEach(el => el.classList.add("hidden"));
  tempUser = null;
}

function logout() {
  currentUser = null;
  realAdmin = null;
  currentView = "home";
  document.getElementById("main-dashboard").classList.add("hidden");
  document.getElementById("login-container").style.display = "flex";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("admin-controls-header").innerHTML = "";
}

// --- IMPERSONATION ---
function impersonateUser(id) {
  if (!realAdmin) realAdmin = currentUser;
  currentUser = id;
  currentView = "home";
  alert(`Logged in as ${users[id].name}`);
  setupDashboard(id);
}

function returnToAdmin() {
  if (realAdmin) {
    currentUser = realAdmin;
    realAdmin = null;
    currentView = "users";
    setupDashboard(currentUser);
  }
}

// --- ADMIN USER MANAGEMENT ---
function openEditModal(username, mode) {
  targetUserForEdit = username;
  editMode = mode;
  document.getElementById("modal-title").innerText = mode === "pass" ? "Change Password" : "Change Access Code";
  document.getElementById("target-user-display").innerText = `Editing: ${users[username].name}`;
  document.getElementById("new-data-input").value = "";
  document.getElementById("password-modal").classList.remove("hidden");
}

function confirmDataChange() {
  const val = document.getElementById("new-data-input").value;
  if (!val) return alert("Value cannot be empty");
  if (editMode === "pass") users[targetUserForEdit].pass = val;
  else users[targetUserForEdit].accessCode = val;
  saveDatabase();
  closePassModal();
  setupDashboard(currentUser);
}

function closePassModal() { 
  document.getElementById("password-modal").classList.add("hidden"); 
  targetUserForEdit = null;
}

function createNewUser() {
  const id = document.getElementById("new-id").value;
  const pass = document.getElementById("new-pass").value;
  const name = document.getElementById("new-name").value;
  const role = document.getElementById("new-role").value;
  if (!id || !pass) return alert("Fill all fields");

  let access = role === "Student" ? "S-" + Math.floor(Math.random()*1000) : "";
  users[id] = { pass, role, name, marks: [], attendance: 0, accessCode: access };
  saveDatabase();
  alert("Created!");
  setupDashboard(currentUser);
}

function deleteUser(id) {
  if (confirm(`Delete ${id}?`)) {
    delete users[id];
    saveDatabase();
    setupDashboard(currentUser);
  }
}

// --- MEETING FUNCTIONS ---
function createMeeting() { activeMeetingCode = "CLASS-" + Math.floor(1000 + Math.random()*9000); setupDashboard(currentUser); }
function launchMeeting(code) { if (code) window.open("https://meet.jit.si/" + code, "_blank"); }

function joinMeeting() {
  const codeIn = document.getElementById("join-code").value;
  const accessIn = document.getElementById("join-access").value;
  if (codeIn !== activeMeetingCode) return alert("Invalid Meeting Code");
  if (accessIn !== users[currentUser].accessCode) return alert("Invalid Access Code");

  meetingLogs.unshift({ student: users[currentUser].name, id: currentUser, classCode: codeIn, loginTime: new Date().toLocaleTimeString(), logoutTime: "Active" });
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

// --- DASHBOARD RENDERER ---
function setupDashboard(userId) {
  const user = users[userId];
  const role = user.role;
  currentView = currentView || "home";

  document.querySelectorAll(".menu a").forEach(el => el.classList.remove("active"));
  if (document.getElementById(`nav-${currentView}`)) document.getElementById(`nav-${currentView}`).classList.add("active");

  // Sidebar visibility
  document.getElementById("nav-users").style.display = (role === "Admin" || role === "Master") ? "flex" : "none";
  document.getElementById("nav-info").style.display = role === "Master" ? "none" : "flex";

  // Return to Admin button
  const headerControls = document.getElementById("admin-controls-header");
  headerControls.innerHTML = realAdmin ? `<button onclick="returnToAdmin()" class="btn-login small" style="background:#FF6584; margin-right:10px;">Return to Admin</button>` : "";

  // Welcome header
  document.getElementById("welcome-header").innerText = `${role} Dashboard`;
  document.getElementById("welcome-message").innerText = `Hello, ${user.name}`;

  const view = document.getElementById("simple-view");
  view.innerHTML = "";

  // --- USERS MANAGEMENT ---
  if (currentView === "users" && (role === "Admin" || role === "Master")) {
    let userListHTML = "";
    for (let u in users) {
      if (u === "master" && role !== "Master") continue;
      let buttons = `<button class="btn-login small" onclick="impersonateUser('${u}')">Login</button>`;
      if (users[u].role === "Teacher" || users[u].role === "Admin") buttons += `<button class="btn-login small" onclick="openEditModal('${u}','pass')">Pass</button>`;
      if (users[u].role === "Student") buttons += `<button class="btn-login small" onclick="openEditModal('${u}','access')">Access</button>`;
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
        <button class="btn-login" style="background:#00b894;" onclick="openClassModal()">+ Add Class (Upload CSV)</button>
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
        html += `<li>${users[u].name} - Attendance: ${users[u].attendance}% - Access: ${users[u].accessCode}</li>`;
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
  view.innerHTML = `<div class="simple-box"><h3>Welcome</h3><p>Select an option from the sidebar.</p></div>`;
}

// --- CLASS UPLOAD FUNCTIONS ---
function openClassModal() {
  document.getElementById("class-modal").classList.remove("hidden");
}

function closeClassModal() {
  document.getElementById("class-modal").classList.add("hidden");
  document.getElementById("class-name").value = "";
  document.getElementById("csv-file").value = "";
}

function uploadClass() {
  const className = document.getElementById("class-name").value.trim();
  const fileInput = document.getElementById("csv-file");
  if (!className || !fileInput.files.length)
    return alert("Please enter class name and upload a CSV file.");

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const lines = e.target.result.split("\n").filter((l) => l.trim() !== "");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    if (!headers.includes("name") || !headers.includes("id") || !headers.includes("password")) {
      alert("Invalid CSV format. Required headers: name, id, password");
      return;
    }

    const nameIdx = headers.indexOf("name");
    const idIdx = headers.indexOf("id");
    const passIdx = headers.indexOf("password");

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",");
      if (row.length < 3) continue;
      const name = row[nameIdx].trim();
      const id = row[idIdx].trim();
      const pass = row[passIdx].trim();

      if (!id || !pass) continue;

      users[id] = {
        pass,
        role: "Student",
        name,
        stdClass: className,
        accessCode: "S-" + Math.floor(Math.random() * 1000),
        marks: [],
        attendance: 0,
      };
      count++;
    }

    saveDatabase();
    alert(`✅ ${count} students added to Class ${className}`);
    closeClassModal();
    setupDashboard(currentUser);
  };

  reader.readAsText(file);
}
