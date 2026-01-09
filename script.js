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

// Wait until Firebase modules are available
if (!window.firebaseModules) {
  console.error("Firebase modules not loaded — check index.html imports!");
}

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
let targetUserForEdit = null;
let editMode = null;

// --- BOOT FADE + LOAD DATA ---
window.addEventListener("load", () => {
  setTimeout(() => {
    const boot = document.getElementById("boot-screen");
    if (boot) boot.classList.add("fade-out");
    loadDatabase();
  }, 1200);
});

// --- DEFAULT USERS ---
const defaultUsers = {
  master: { pass: "master999", role: "Master", name: "System Overlord", quest: "Override Code", ans: "omega-level", voicePass: "activate system" },
  admin: { pass: "admin123", role: "Admin", name: "Principal System", quest: "Master Key?", ans: "aura-master" },
  teach1: { pass: "teach123", role: "Teacher", name: "Mr. Sharma", subject: "Math" },
  stud1: { pass: "stud123", role: "Student", name: "Rahul", stdClass: "10th A", accessCode: "S-101", marks: ["Math: 95"], attendance: 85 }
};

// --- DATABASE HANDLERS ---
async function loadDatabase() {
  const saved = localStorage.getItem("auraFlowDB");
  users = saved ? JSON.parse(saved) : { ...defaultUsers };

  const logs = localStorage.getItem("auraLogs");
  meetingLogs = logs ? JSON.parse(logs) : [];

  try {
    const docRef = window.firebaseModules.doc(db, "schoolSystem", "mainData");
    const docSnap = await window.firebaseModules.getDoc(docRef);
    if (docSnap.exists()) {
      users = docSnap.data().users;
      meetingLogs = docSnap.data().logs || [];
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
  } catch (e) {
    console.error("Cloud Error", e);
  }
}

// --- LOGIN LOGIC ---
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");
  console.log("Attempt:", user, users);

  if (users[user] && users[user].pass === pass) {
    if (users[user].role === "Admin" || users[user].role === "Master") {
      document.getElementById("security-question-text").innerText = users[user].quest;
      document.getElementById("security-modal").classList.remove("hidden");
      tempUser = user;
      errorMsg.style.display = "none";
    } else {
      currentUser = user;
      finalizeLogin();
    }
  } else errorMsg.style.display = "block";
}

let tempUser = null;
function verifySecurityAnswer() {
  const ans = document.getElementById("security-answer").value;
  if (ans === users[tempUser].ans) {
    document.getElementById("security-modal").classList.add("hidden");
    currentUser = tempUser;
    tempUser = null;
    if (currentUser === "master")
      document.getElementById("master-choice-modal").classList.remove("hidden");
    else finalizeLogin();
  } else {
    document.getElementById("security-error").style.display = "block";
  }
}

function chooseAuth(type) {
  document.getElementById("master-choice-modal").classList.add("hidden");
  if (type === "voice")
    document.getElementById("voice-modal").classList.remove("hidden");
  else
    document.getElementById("override-modal").classList.remove("hidden");
}

function checkOverrideCode() {
  if (document.getElementById("override-code-input").value === users["master"].ans) {
    document.getElementById("override-modal").classList.add("hidden");
    finalizeLogin();
  } else alert("ACCESS DENIED");
}

function finalizeLogin() {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("main-dashboard").classList.remove("hidden");
  setupDashboard(currentUser);
}

// --- DASHBOARD VIEW (minimal for test) ---
function setupDashboard(userId) {
  const user = users[userId];
  document.getElementById("welcome-header").innerText = `${user.role} Dashboard`;
  document.getElementById("welcome-message").innerText = `Welcome, ${user.name}`;
  document.getElementById("simple-view").innerHTML = `<div class="simple-box"><h3>Hello ${user.name}</h3><p>Role: ${user.role}</p></div>`;
}

