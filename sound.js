/* ======================
   SOUND CONTROLLER
   ====================== */

const sndClick = document.getElementById('snd-click');
const sndTick = document.getElementById('snd-tick');
const sndResult = document.getElementById('snd-result');

let audioUnlocked = false;
let audioContext = null;
let unlockCallbacks = [];

/* ======================
   AUDIO UNLOCK
   ====================== */

function unlockAudio() {
  if (audioUnlocked) return;
  
  // Create and resume AudioContext if needed (with compatibility check)
  if (!audioContext) {
    // Check if AudioContext is available
    if (window.AudioContext || window.webkitAudioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      try {
        audioContext = new AudioContextClass();
      } catch (e) {
        console.log("AudioContext creation failed:", e);
      }
    }
  }
  
  // Try to resume AudioContext if it exists and is suspended
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(function(e) {
        console.log("AudioContext resume failed:", e);
      });
    }
  }
  
  // Play/pause all audio elements to unlock them
  const sounds = document.querySelectorAll('audio');
  const promises = [];
  
  sounds.forEach(function(sound) {
    try {
      // Set volume very low for unlock
      sound.volume = 0.01;
      
      // Play and immediately pause to unlock
      const playPromise = sound.play();
      
      if (playPromise !== undefined) {
        promises.push(playPromise.then(function() {
          sound.pause();
          sound.currentTime = 0;
          sound.volume = 1;
          return true;
        }).catch(function() {
          // Ignore errors during unlock
          return false;
        }));
      }
    } catch (e) {
      // Ignore errors
    }
  });
  
  // Mark as unlocked once all promises resolve
  Promise.all(promises).then(function() {
    audioUnlocked = true;
    
    // Run any queued callbacks
    unlockCallbacks.forEach(function(callback) {
      callback();
    });
    unlockCallbacks = [];
  });
}

/* ======================
   PLAY HELPER
   ====================== */

function playSound(snd, volume, rate) {
  if (!snd) return;
  
  // Default values if not provided
  volume = volume || 0.025;
  rate = rate || 1;
  
  // If audio isn't unlocked yet, queue the sound
  if (!audioUnlocked) {
    unlockCallbacks.push(function() {
      playSound(snd, volume, rate);
    });
    unlockAudio();
    return;
  }
  
  // Reset and play
  snd.currentTime = 0;
  snd.volume = volume;
  snd.playbackRate = rate;
  
  try {
    const playPromise = snd.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(function(error) {
        console.log("Audio play failed:", error);
        // Try to unlock again on failure
        audioUnlocked = false;
        unlockCallbacks.push(function() {
          playSound(snd, volume, rate);
        });
        unlockAudio();
      });
    }
  } catch (e) {
    console.log("Audio play exception:", e);
  }
}

/* ======================
   EVENT HANDLERS
   ====================== */

function handleStartClick() {
  unlockAudio();
  playSound(sndClick, 0.002, 1);
}

function handleRPSClick() {
  unlockAudio();
  playSound(sndClick, 0.9, 1.5);
}

function handleResultSound() {
  unlockAudio();
  playSound(sndResult, 0.02, 1);
}

/* ======================
   BIND EVENTS
   ====================== */

// Bind audio unlock to ALL interactive elements
function bindAudioUnlock() {
  function unlockHandler() {
    unlockAudio();
    // Remove listeners after first successful unlock
    document.removeEventListener('click', unlockHandler);
    document.removeEventListener('touchstart', unlockHandler);
    document.removeEventListener('keydown', unlockHandler);
  }
  
  document.addEventListener('click', unlockHandler);
  document.addEventListener('touchstart', unlockHandler);
  document.addEventListener('keydown', unlockHandler);
}

// Bind specific sound handlers
function bindSoundHandlers() {
  const startBtn = document.querySelector('.btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', handleStartClick);
  }

  const rpsBtns = document.querySelectorAll('.btn');
  rpsBtns.forEach(function(btn) {
    btn.addEventListener('click', handleRPSClick);
  });
}

/* ======================
   OBSERVE SCREEN TEXT FOR RESULTS
   ====================== */

function setupResultObserver() {
  const screenText = document.querySelector('.screen-text');

  if (screenText && window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        const txt = screenText.textContent;
        if (txt.indexOf('WIN') !== -1 || txt.indexOf('LOSE') !== -1 || txt.indexOf('DRAW') !== -1) {
          handleResultSound();
        }
      });
    });

    observer.observe(screenText, {
      childList: true,
      subtree: true
    });
  }
}

// Also add tick sound function
function playTickSound() {
  unlockAudio();
  playSound(sndTick, 0.05, 1);
}

/* ======================
   INITIALIZATION
   ====================== */

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    bindAudioUnlock();
    bindSoundHandlers();
    setupResultObserver();
  });
} else {
  // DOM already loaded
  bindAudioUnlock();
  bindSoundHandlers();
  setupResultObserver();
}

// Export for use in script.js if needed
window.soundController = {
  playSound: playSound,
  unlockAudio: unlockAudio,
  playTickSound: playTickSound
};