/* ======================
   WEB AUDIO API CONTROLLER (Low Latency)
   ====================== */

const audioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = new audioContextClass();
let buffers = {};
let audioUnlocked = false;

// Map the ID of your audio tags to the actual file paths
const soundManifest = {
  'snd-click': 'sounds/click.mp3',
  'snd-tick': 'sounds/tick.mp3',
  'snd-result': 'sounds/result.mp3'
};

/* ======================
   LOADER
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

// Start loading immediately
preloadSounds();

/* ======================
   PLAYBACK ENGINE
   ====================== */

function playSound(elementOrId, volume = 1, rate = 1) {
  // Resume context if suspended (browser requirement)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Handle if 'elementOrId' is a DOM element (passed by script.js) or a string ID
  let id = typeof elementOrId === 'string' ? elementOrId : elementOrId.id;

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
  if (audioUnlocked) return;
  // Play a silent buffer to unlock iOS audio engine
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  audioUnlocked = true;
}

/* ======================
   INTEGRATION & BINDINGS
   ====================== */

function playTickSound() {
  playSound('snd-tick', 0.15, 1);
}

// Bind unlock to initial user interaction
['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true });
});

// Setup Result Observer (Detects Win/Lose text)
function setupResultObserver() {
  const screenText = document.querySelector('.screen-text');
  if (screenText && window.MutationObserver) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(() => {
        const txt = screenText.textContent;
        // Check for game end states
        if (txt.includes('WIN') || txt.includes('LOSE') || txt.includes('DRAW')) {
          playSound('snd-result', 0.2, 1);
        }
      });
    });
    observer.observe(screenText, { childList: true, subtree: true });
  }
}

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
  setupResultObserver();
  
  // Start Button Sound
  const btnStart = document.querySelector('.btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', () => playSound('snd-click', 0.2, 1));
  }

  // Reset Button Sound
  const btnReset = document.querySelector('.btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => playSound('snd-click', 0.2, 1));
  }

  // RPS Button Sounds
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => playSound('snd-click', 0.9, 1.5));
  });
});

// Export to window so script.js can call it
window.soundController = {
  playSound: playSound,
  playTickSound: playTickSound,
  unlockAudio: unlockAudio
};