const DB_NAME = "videoAppDB";
const STORE_NAME = "videos";
const VIDEO_KEY = "currentVideo";

const player = document.getElementById("player");
const addBtn = document.getElementById("addBtn");
const fileInput = document.getElementById("fileInput");

let hideTimer = null;

// ---------- IndexedDB helpers ----------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveVideo(blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, VIDEO_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadVideo() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(VIDEO_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ---------- UI logic ----------
function playBlob(blob) {
  const url = URL.createObjectURL(blob);
  player.src = url;
  player.classList.add("active");
  player.loop = true;
  player.play().catch(() => {
    // autoplay may be blocked until user interacts; that's fine
  });
  hideAddButton();
}

function showAddButton() {
  addBtn.classList.remove("hidden");
  clearTimeout(hideTimer);
  if (player.classList.contains("active")) {
    hideTimer = setTimeout(hideAddButton, 3000);
  }
}

function hideAddButton() {
  addBtn.classList.add("hidden");
}

addBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await saveVideo(file);
  playBlob(file);
  fileInput.value = "";
});

// tap on the video briefly reveals the add button so the user
// can swap the video later without the app looking like a player
player.addEventListener("click", () => {
  if (addBtn.classList.contains("hidden")) {
    showAddButton();
  } else {
    hideAddButton();
  }
});

// ---------- init ----------
(async () => {
  try {
    const existing = await loadVideo();
    if (existing) {
      playBlob(existing);
    } else {
      showAddButton();
    }
  } catch (err) {
    showAddButton();
  }
})();

// register service worker for offline / installability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
