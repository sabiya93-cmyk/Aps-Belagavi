// --- FIREBASE CONFIGURATION ---
// Wait until firebaseModules is ready
if (!window.firebaseModules) {
  console.error("Firebase modules not loaded — check your index.html imports!");
}

// Initialize Firebase and Firestore
const app = window.firebaseModules.initializeApp({
  apiKey: "AIzaSyCaHjvIQUOF2OtsdIqZp45RCKYTFKh8QwM",
  authDomain: "aps-belagavi.firebaseapp.com",
  projectId: "aps-belagavi",
  storageBucket: "aps-belagavi.appspot.com",
  messagingSenderId: "858834476044",
  appId: "1:858834476044:web:944b457fd2a7b0c0e42229",
  measurementId: "G-B4729784Q4"
});

const db = window.firebaseModules.getFirestore(app);
const analytics = window.firebaseModules.getAnalytics(app);

// Fade out boot screen and load data
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("boot-screen").classList.add("fade-out");
    loadDatabase();
  }, 1000);
});

// --- DATABASE DEFAULTS ---
const defaultUsers = {
  "master": {
    pass: "master999",
    role: "Master",
    name: "System Overlord",
    quest: "Override Code",
    ans: "omega-level",
    voicePass: "activate system"
  },
  "admin": {
    pass: "admin123",
    role: "Admin",
    name: "Principal System",
    quest: "Master Key?",
    ans: "aura-master"
  },
  "teach1": { pass: "teach123", role: "Teacher", name: "Mr. Sharma", subject: "Math" },
  "stud1": {
    pass: "stud123",
    role: "Student",
    name: "Rahul",
    stdClass: "10th A",
    accessCode: "S-101",
    marks: ["Math: 95"],
    attendance: 85
  }
};

let users = {};
let meetingLogs = [];
let activeMeetingCode = null;
let currentUser = null;
let realAdmin = null;
let currentView = "home";
let targetUserForEdit = null;
let editMode = null;

// --- BOOT SCREEN HANDLER ---
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("boot-screen").classList.add("fade-out");
    loadDatabase();
  }, 1200);
});

// --- DATA HANDLING ---
async function loadDatabase() {
  const savedData = localStorage.getItem("auraFlowDB");
  if (savedData) users = JSON.parse(savedData);
  else users = JSON.parse(JSON.stringify(defaultUsers));

  const savedLogs = localStorage.getItem("auraLogs");
  if (savedLogs) meetingLogs = JSON.parse(savedLogs);

  if (db) {
    try {
      const docRef = window.firebaseModules.doc(db, "schoolSystem", "mainData");
      const docSnap = await window.firebaseModules.getDoc(docRef);
      if (docSnap.exists()) {
        users = docSnap.data().users;
        meetingLogs = docSnap.data().logs || [];
        saveLocal();
      } else {
        saveDatabase();
      }
    } catch (e) {
      console.log("Offline");
    }
  }
}

async function saveDatabase() {
  localStorage.setItem("auraFlowDB", JSON.stringify(users));
  localStorage.setItem("auraLogs", JSON.stringify(meetingLogs));
  if (db) {
    try {
      await window.firebaseModules.setDoc(
        window.firebaseModules.doc(db, "schoolSystem", "mainData"),
        { users: users, logs: meetingLogs }
      );
    } catch (e) {
      console.error("Cloud Error", e);
    }
  }
}

function saveLocal() {
  localStorage.setItem("auraFlowDB", JSON.stringify(users));
  localStorage.setItem("auraLogs", JSON.stringify(meetingLogs));
}

// --- LOGIN & SECURITY ---
function login() {
  const userIn = document.getElementById("username").value;
  const passIn = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");

  console.log("Trying login:", userIn, passIn, users);

  if (users[userIn] && users[userIn].pass === passIn) {
    if (users[userIn].role === "Admin" || users[userIn].role === "Master") {
      document.getElementById("security-question-text").innerText =
        users[userIn].quest || "Security Verification";
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

let tempUser = null;
function verifySecurityAnswer() {
  const ansIn = document.getElementById("security-answer").value;
  if (ansIn === users[tempUser].ans) {
    document.getElementById("security-modal").classList.add("hidden");
    document.getElementById("security-answer").value = "";
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
  else document.getElementById("override-modal").classList.remove("hidden");
}

function checkOverrideCode() {
  if (
    document.getElementById("override-code-input").value === users["master"].ans
  ) {
    document.getElementById("override-modal").classList.add("hidden");
    finalizeLogin();
  } else alert("ACCESS DENIED");
}

function startVoiceListening() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice API not supported.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.start();
  recognition.onresult = (e) => {
    if (
      e.results[0][0].transcript
        .toLowerCase()
        .includes(users["master"].voicePass)
    ) {
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
    }, 1500);
  } else {
    document.getElementById("main-dashboard").classList.remove("hidden");
    setupDashboard(currentUser);
  }
}

function cancelLogin() {
  document.querySelectorAll(".modal-overlay").forEach((el) =>
    el.classList.add("hidden")
  );
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

// --- REST OF YOUR LOGIC (impersonation, admin, meeting, etc.) ---
// Keep everything below exactly as it is from your current file
