/* ======================
   WEB AUDIO API CONTROLLER
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
preloadSounds();

function playSound(id, volume = 1, rate = 1) {
  if (audioCtx.state === "suspended") audioCtx.resume(); // Requirement for mobile
  const buffer = buffers[id];
  if (!buffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.start(0);
}

function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  audioUnlocked = true;
}

window.soundController = {
  playCountdownTick: () => playSound("snd-tick", 0.15, 1),
  playForfeitSound: () => playSound("snd-tick", 0.2, 0.8),
  unlockAudio: unlockAudio
};

// Global click/touch sound bindings
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => playSound("snd-click", 0.2, 1));
  });

  // Setup Result Observer
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
});
