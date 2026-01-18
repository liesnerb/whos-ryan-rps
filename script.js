/* ======================
   DOM REFERENCES & SETUP
   ====================== */
var screenText = document.querySelector('.screen-text');
var rpsButtons = document.querySelectorAll('.btn');
var startButton = document.querySelector('.btn-start');
var resetButton = document.querySelector('.btn-reset');
var titleCanvas = document.getElementById('titleCanvas');
var ctx = titleCanvas.getContext('2d');
var deviceWrapper = document.querySelector('.device-wrapper');
var device = document.querySelector('.device');

titleCanvas.width = 160;
titleCanvas.height = 36;

// Game Config
var COUNTDOWN_SPEED = 500; // Fast countdown
var REVEAL_DELAY = 800;    // Wait 0.8s for suspense
var ROUND_PAUSE = 1500;    // Break between rounds
var moves = ['rock', 'paper', 'scissors'];

var gameState = 'title', timeLeft = 3, playerMove = null;
var countdownInterval, animId, t = 0;
var roundTimeout = null; // Track round timeout

// 3D Parallax Variables
var isDragging = false;
var mouseX = 0, mouseY = 0;
var rotateX = 0, rotateY = 0;
var targetRotateX = 0, targetRotateY = 0;
var lastMouseX = 0, lastMouseY = 0;

// 3D Parallax Configuration
var MAX_TILT = 8; // Reduced for less distortion
var PARALLAX_FACTOR = 0.2; // How much layers shift
var SMOOTHING = 0.1;

/* ======================
   SIMPLE 3D PARALLAX SYSTEM
   ====================== */
function init3DParallax() {
  // Mouse movement
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', resetTilt);
  
  // Touch support
  deviceWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
  deviceWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
  deviceWrapper.addEventListener('touchend', resetTilt);
  
  // Update parallax
  requestAnimationFrame(updateParallax);
}

function handleMouseMove(e) {
  if (!deviceWrapper) return;
  
  var rect = deviceWrapper.getBoundingClientRect();
  var centerX = rect.left + rect.width / 2;
  var centerY = rect.top + rect.height / 2;
  
  // Calculate mouse position relative to center (-1 to 1)
  var normalizedX = (e.clientX - centerX) / (rect.width / 2);
  var normalizedY = (e.clientY - centerY) / (rect.height / 2);
  
  // Clamp and set target rotation
  targetRotateY = clamp(normalizedX, -1, 1) * MAX_TILT;
  targetRotateX = -clamp(normalizedY, -1, 1) * MAX_TILT;
}

function handleTouchStart(e) {
  e.preventDefault();
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!deviceWrapper) return;
  
  var touch = e.touches[0];
  var rect = deviceWrapper.getBoundingClientRect();
  var centerX = rect.left + rect.width / 2;
  var centerY = rect.top + rect.height / 2;
  
  var normalizedX = (touch.clientX - centerX) / (rect.width / 2);
  var normalizedY = (touch.clientY - centerY) / (rect.height / 2);
  
  targetRotateY = clamp(normalizedX, -1, 1) * MAX_TILT;
  targetRotateX = -clamp(normalizedY, -1, 1) * MAX_TILT;
}

function resetTilt() {
  targetRotateX = 0;
  targetRotateY = 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ======================
   REACTIVE GLOSSY LIGHT STREAK
   ====================== */
function updateScreenGloss(rotateX, rotateY) {
  const screen = document.querySelector('.screen');
  if (!screen) return;
  
  // Calculate light streak position based on device rotation
  // Map rotation values (degrees) to background position percentages
  const maxRotation = 15; // Maximum expected rotation in degrees
  
  // Convert rotation to percentage (-100% to 100%)
  let posX = (rotateY / maxRotation) * 100;
  let posY = (-rotateX / maxRotation) * 100;
  
  // Clamp values to -100% to 100%
  posX = Math.max(Math.min(posX, 100), -100);
  posY = Math.max(Math.min(posY, 100), -100);
  
  // Convert to CSS background position (0% to 100% scale)
  const cssPosX = 50 + (posX / 2);
  const cssPosY = 50 + (posY / 2);
  
  // Calculate light intensity based on angle
  const intensity = 0.3 + (Math.abs(rotateX) + Math.abs(rotateY)) * 0.01;
  
  // Calculate angle for gradient based on rotation
  const angle = 135 + (rotateY * 0.5);
  
  // Update the ::before pseudo-element's background
  const style = document.createElement('style');
  style.textContent = `
    .screen::before {
      background: linear-gradient(
        ${angle}deg,
        transparent 0%,
        rgba(255, 255, 255, ${0.1 + intensity * 0.3}) 20%,
        rgba(255, 255, 255, ${0.2 + intensity * 0.4}) 50%,
        rgba(255, 255, 255, ${0.1 + intensity * 0.3}) 80%,
        transparent 100%
      );
      background-position: ${cssPosX}% ${cssPosY}%;
      background-size: ${150 + intensity * 50}% ${150 + intensity * 50}%;
      opacity: ${0.2 + intensity * 0.3};
    }
  `;
  
  // Remove old style and add new one
  const oldStyle = document.getElementById('dynamic-gloss');
  if (oldStyle) oldStyle.remove();
  style.id = 'dynamic-gloss';
  document.head.appendChild(style);
}

function updateParallax() {
  // Smooth interpolation
  rotateX += (targetRotateX - rotateX) * SMOOTHING;
  rotateY += (targetRotateY - rotateY) * SMOOTHING;
  
  // Apply rotation to main device
  if (device) {
    device.style.transform = `
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;
  }
  
  // Apply parallax to layers based on their depth
  applyLayerParallax();
  
  // Update the reactive screen gloss
  updateScreenGloss(rotateX, rotateY);
  
  requestAnimationFrame(updateParallax);
}

function applyLayerParallax() {
  // Get all layers
  var layers = document.querySelectorAll('.layer, .screen, button');
  
  layers.forEach(function(layer) {
    // Calculate parallax offset based on depth
    var depth = 0;
    
    // Assign depth based on layer type
    if (layer.classList.contains('shell')) depth = 0;
    else if (layer.classList.contains('embossed')) depth = 6;
    else if (layer.classList.contains('buttons')) depth = 10;
    else if (layer.classList.contains('logo')) depth = 14;
    else if (layer.classList.contains('rps')) depth = 15;
    else if (layer.classList.contains('screen-art')) depth = 22;
    else if (layer.classList.contains('light')) depth = 30;
    else if (layer.classList.contains('screen')) depth = 18;
    else if (layer.tagName === 'BUTTON') depth = 40;
    
    // Calculate parallax offset based on depth
    var parallaxMultiplier = depth / 100;
    var offsetX = rotateY * parallaxMultiplier * PARALLAX_FACTOR * 10;
    var offsetY = -rotateX * parallaxMultiplier * PARALLAX_FACTOR * 10;
    
    // Apply transform with base Z translation
    var baseZ = depth + 'px';
    layer.style.transform = `translate3d(${offsetX}px, ${offsetY}px, ${baseZ})`;
  });
}

/* ======================
   TITLE RENDERING (Preserved Animation)
   ====================== */
var buffer = document.createElement('canvas');
var bctx = buffer.getContext('2d');
buffer.width = titleCanvas.width;
buffer.height = titleCanvas.height;

function drawTitleText() {
  bctx.clearRect(0, 0, buffer.width, buffer.height);
  bctx.fillStyle = '#121e12';
  bctx.font = '900 20px "Archivo Black", sans-serif'; 
  bctx.textBaseline = 'middle';
  bctx.textAlign = 'center';
  bctx.fillText("WHO'S RYAN", buffer.width / 2, buffer.height / 2);
}

function drawTitle() {
  ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
  var sweep = (Math.cos(t * 0.6) * -0.5 + 0.5) * (titleCanvas.width + 80) - 40;
  for (var x = 0; x < titleCanvas.width; x += 3) {
    var dist = Math.abs(x - sweep), yOffset = 0;
    if (dist < 50) {
      yOffset = (Math.random() - 0.5) * (1 - dist / 50) * 6;
    }
    ctx.drawImage(buffer, x, 0, 3, buffer.height, x, yOffset, 3, buffer.height);
  }
  t += 0.04;
  animId = requestAnimationFrame(drawTitle);
}

/* ======================
   GAME LOGIC
   ====================== */

function renderDots(n) {
  // Clear any existing content
  screenText.innerHTML = ''; 
  
  // Create a container for the circles
  var container = document.createElement('div');
  container.className = 'dots-container';
  
  for (var i = 1; i <= 3; i++) {
    var dot = document.createElement('span');
    dot.className = 'dot' + (i <= n ? ' filled' : '');
    container.appendChild(dot);
  }
  screenText.appendChild(container);
  
  // Play tick sound whenever dots update (except when showing 3 dots initially)
  if (n < 3 && window.soundController) {
    window.soundController.playCountdownTick();
  }
}

function showTitleScreen() {
  // Clear any pending timeouts
  clearInterval(countdownInterval);
  cancelAnimationFrame(animId);
  
  // Clear any pending round timeout
  if (roundTimeout) {
    clearTimeout(roundTimeout);
    roundTimeout = null;
  }
  
  // Reset game state
  gameState = 'title';
  timeLeft = 3;
  playerMove = null;
  
  // Show title screen
  titleCanvas.style.display = 'block';
  screenText.innerHTML = "<span class='blink'>PRESS START</span>";
  drawTitleText();
  drawTitle();
}

function startRound() {
  // Clear any existing timeout
  if (roundTimeout) {
    clearTimeout(roundTimeout);
    roundTimeout = null;
  }
  
  cancelAnimationFrame(animId); // Stop title animation
  gameState = 'countdown';
  timeLeft = 3;
  playerMove = null;
  titleCanvas.style.display = 'none';
  
  renderDots(timeLeft); // Initial render (no sound for 3 dots)
  
  countdownInterval = setInterval(function() {
    timeLeft--;
    renderDots(timeLeft); // This will play tick sound
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      if (!playerMove) {
        screenText.innerHTML = 'FORFEIT';
        // Play forfeit sound
        if (window.soundController) {
          window.soundController.playForfeitSound();
        }
        roundTimeout = setTimeout(startRound, ROUND_PAUSE);
      }
    }
  }, COUNTDOWN_SPEED);
}

function playRound(move) {
  if (gameState !== 'countdown' || playerMove || timeLeft <= 0) return;
  
  playerMove = move;
  clearInterval(countdownInterval);
  
  // Suspend phase: Clear circles and show waiting
  screenText.innerHTML = '...'; 

  setTimeout(function() {
    resolveRound(playerMove);
  }, REVEAL_DELAY);
}

function resolveRound(move) {
  var cpu = moves[Math.floor(Math.random() * moves.length)];
  var result = "";
  
  if (move === cpu) result = 'DRAW';
  else if ((move === 'rock' && cpu === 'scissors') || 
           (move === 'paper' && cpu === 'rock') || 
           (move === 'scissors' && cpu === 'paper')) {
    result = 'WIN';
  } else {
    result = 'LOSE';
  }
  
  screenText.innerHTML = result;
  
  // Store the timeout ID so we can cancel it if needed
  roundTimeout = setTimeout(startRound, ROUND_PAUSE);
}

/* ======================
   CONTROLS & INIT
   ====================== */
rpsButtons.forEach(function(b) {
  b.addEventListener('click', function() {
    // Force audio unlock on mobile
    if (window.soundController) {
      window.soundController.forceAudioUnlock();
    }
    if (b.dataset.move) playRound(b.dataset.move);
  });
});

startButton.addEventListener('click', function() { 
  // Force audio unlock before starting
  if (window.soundController) {
    window.soundController.forceAudioUnlock();
  }
  
  // Small delay to ensure audio context is ready
  setTimeout(() => {
    if (gameState === 'title') {
      startRound();
    }
  }, 100);
});

resetButton.addEventListener('click', function() {
  // Force audio unlock on reset click too
  if (window.soundController) {
    window.soundController.forceAudioUnlock();
  }
  showTitleScreen();
});

// Initialize everything
function initGame() {
  // Start 3D parallax system
  init3DParallax();
  
  // Start title screen
  if (document.fonts) {
    document.fonts.load('1em "Archivo Black"').then(showTitleScreen);
  } else {
    showTitleScreen();
  }
  
  console.log("Game initialized with 3D parallax and reactive screen gloss");
}

window.addEventListener('DOMContentLoaded', initGame);