const DB_NAME = "videoAppDB";
const STORE_NAME = "videos";
const VIDEO_KEY = "currentVideo";

const player = document.getElementById("player");
const controls = document.getElementById("controls");
const addBtn = document.getElementById("addBtn");
const deleteBtn = document.getElementById("deleteBtn");
const fileInput = document.getElementById("fileInput");
let hideTimer = null;
let currentBlobUrl = null; // Track current URL to clean up properly

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

async function deleteVideoFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(VIDEO_KEY);
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
function cleanupCurrentVideo() {
  // Stop playback
  player.pause();
  
  // Properly clean up the object URL
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch (e) {
      console.warn("Error revoking URL:", e);
    }
    currentBlobUrl = null;
  }
  
  // Reset video source
  player.removeAttribute("src");
  player.load();
}

function playBlob(blob) {
  // Clean up previous video first
  cleanupCurrentVideo();
  
  // Create new URL
  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  
  // Set source and configure
  player.src = url;
  player.classList.add("active");
  player.loop = false; // Disable loop to prevent issues
  
  // Add ended event to show controls when video ends
  player.onended = () => {
    showAddButton();
  };
  
  // Play with error handling
  const playPromise = player.play();
  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.log("Autoplay prevented:", error);
      // User interaction may be needed
    });
  }
  
  hideAddButton();
}

function showAddButton() {
  controls.classList.remove("hidden");
  clearTimeout(hideTimer);
  if (player.classList.contains("active")) {
    hideTimer = setTimeout(hideAddButton, 3000);
  }
}

function hideAddButton() {
  controls.classList.add("hidden");
}

addBtn.addEventListener("click", () => {
  fileInput.click();
});

deleteBtn.addEventListener("click", async () => {
  await deleteVideoFromDB();
  cleanupCurrentVideo();
  player.classList.remove("active");
  clearTimeout(hideTimer);
  showAddButton();
});

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    await saveVideo(file);
    playBlob(file);
  } catch (error) {
    console.error("Error saving video:", error);
    alert("حدث خطأ في حفظ الفيديو");
  }
  
  fileInput.value = "";
});

// Tap on the video to toggle controls
player.addEventListener("click", () => {
  if (controls.classList.contains("hidden")) {
    showAddButton();
  } else {
    hideAddButton();
  }
});

// Clean up before page unload
window.addEventListener("beforeunload", () => {
  cleanupCurrentVideo();
});

// Handle visibility changes to pause when tab is hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    player.pause();
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
    console.error("Error loading video:", err);
    showAddButton();
  }
})();

// Register service worker for offline / installability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
