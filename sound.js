/* ======================
   WEB AUDIO API CONTROLLER (MOBILE-SAFE)
   ====================== */
const audioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = new audioContextClass();
let buffers = {};
let audioUnlocked = false;

const soundManifest = {
  "snd-click": "sounds/click.mp3",
  "snd-tick": "sounds/tick.mp3",
  "snd-result": "sounds/result.mp3"
};

/* ======================
   SOUND PRELOAD
   ====================== */
async function preloadSounds() {
  for (const [id, url] of Object.entries(soundManifest)) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      buffers[id] = audioBuffer;
    } catch (e) {
      console.error("Error loading sound:", url, e);
    }
  }
}

/* ======================
   PLAY SOUND
   ====================== */
function playSound(id, volume = 1, rate = 1) {
  // Always try to resume context first
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.warn("Audio resume failed:", e));
  }

  // Don't play if not unlocked on mobile
  if (!audioUnlocked && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return;
  }

  const buffer = buffers[id];
  if (!buffer) return;

  try {
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {
    console.error("Error playing sound:", id, e);
  }
}

/* ======================
   UNLOCK AUDIO (MOBILE-FRIENDLY)
   ====================== */
function unlockAudio() {
  if (audioUnlocked) return;

  try {
    // Create and play a short silent buffer inside the user gesture
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);

    // Try to resume context immediately
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(err => console.warn("Audio resume failed:", err));
    }

    // Mark unlocked
    audioUnlocked = true;
    console.log("✅ Audio unlocked successfully");

    // Preload sounds after unlock (important for Android/iOS)
    preloadSounds();
  } catch (e) {
    console.error("Audio unlock failed:", e);
  }
}

/* ======================
   FORCE AUDIO UNLOCK
   ====================== */
function forceAudioUnlock() {
  if (!audioUnlocked) unlockAudio();
}

/* ======================
   PUBLIC SOUND CONTROLLER
   ====================== */
window.soundController = {
  playCountdownTick: () => playSound("snd-tick", 0.15, 1),
  playForfeitSound: () => playSound("snd-tick", 0.2, 0.8),
  unlockAudio: unlockAudio,
  forceAudioUnlock: forceAudioUnlock
};

/* ======================
   GLOBAL BINDINGS
   ====================== */
document.addEventListener("DOMContentLoaded", () => {
  // Unlock audio on first button press or touch
  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.soundController) {
        window.soundController.forceAudioUnlock();
      }
      playSound("snd-click", 0.2, 1);
    });
  });

  // Observe results for "WIN / LOSE / DRAW"
  const screenText = document.querySelector(".screen-text");
  if (screenText && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      const txt = screenText.textContent;
      if (txt.includes("WIN") || txt.includes("LOSE") || txt.includes("DRAW")) {
        playSound("snd-result", 0.2, 1);
      }
    });
    observer.observe(screenText, { childList: true, subtree: true });
  }

  // Extra unlock hooks for iOS/Android
  window.addEventListener("touchstart", () => {
    if (!audioUnlocked) unlockAudio();
  }, { once: true, passive: true });

  window.addEventListener("click", () => {
    if (!audioUnlocked) unlockAudio();
  }, { once: true });
});
