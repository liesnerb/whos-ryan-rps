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

// Detect mobile
var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ======================
   SIMPLIFIED MOBILE CONTROLS
   ====================== */

function initMobileControls() {
  if (!isMobile) return;
  
  // Remove complex 3D effects on mobile
  device.style.transform = 'none';
  device.style.willChange = 'auto';
  
  // Simplify buttons for better touch response
  var buttons = document.querySelectorAll('button');
  buttons.forEach(function(btn) {
    btn.style.cursor = 'pointer';
    btn.style.touchAction = 'manipulation';
    btn.style.webkitTapHighlightColor = 'transparent';
  });
}

function initDesktopParallax() {
  if (isMobile) return;
  
  // 3D Parallax Variables
  var rotateX = 0, rotateY = 0;
  var targetRotateX = 0, targetRotateY = 0;
  var MAX_TILT = 8;
  var PARALLAX_FACTOR = 0.2;
  var SMOOTHING = 0.1;

  function handleMouseMove(e) {
    if (!deviceWrapper) return;
    
    var rect = deviceWrapper.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    
    var normalizedX = (e.clientX - centerX) / (rect.width / 2);
    var normalizedY = (e.clientY - centerY) / (rect.height / 2);
    
    targetRotateY = clamp(normalizedX, -1, 1) * MAX_TILT;
    targetRotateX = -clamp(normalizedY, -1, 1) * MAX_TILT;
  }

  function resetTilt() {
    targetRotateX = 0;
    targetRotateY = 0;
  }

  function updateParallax() {
    // Smooth interpolation
    rotateX += (targetRotateX - rotateX) * SMOOTHING;
    rotateY += (targetRotateY - rotateY) * SMOOTHING;
    
    if (device) {
      device.style.transform = `
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
      `;
    }
    
    requestAnimationFrame(updateParallax);
  }

  // Set up events only for desktop
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', resetTilt);
  requestAnimationFrame(updateParallax);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
   CONTROLS & INIT - MOBILE OPTIMIZED
   ====================== */

// Better touch handling for mobile
function handleButtonTouch(e) {
  // Prevent default to avoid double-tap zoom
  e.preventDefault();
  
  // Force audio unlock on mobile
  if (window.soundController) {
    window.soundController.forceAudioUnlock();
  }
  
  // Get the button element
  var button = e.currentTarget;
  
  // Add visual feedback
  button.style.filter = 'brightness(1.4)';
  setTimeout(() => {
    button.style.filter = '';
  }, 100);
  
  // Handle button action
  if (button.classList.contains('btn-start')) {
    if (gameState === 'title') {
      startRound();
    }
  } else if (button.classList.contains('btn-reset')) {
    showTitleScreen();
  } else if (button.dataset.move) {
    playRound(button.dataset.move);
  }
}

// Initialize button events
function initButtons() {
  var allButtons = document.querySelectorAll('button');
  
  allButtons.forEach(function(button) {
    // Remove old event listeners
    button.replaceWith(button.cloneNode(true));
  });
  
  // Get fresh references
  var freshButtons = document.querySelectorAll('button');
  var freshRpsButtons = document.querySelectorAll('.btn[data-move]');
  var freshStartButton = document.querySelector('.btn-start');
  var freshResetButton = document.querySelector('.btn-reset');
  
  // Add optimized touch events for mobile
  if (isMobile) {
    freshButtons.forEach(function(button) {
      button.addEventListener('touchstart', handleButtonTouch, { passive: false });
      button.addEventListener('click', handleButtonTouch);
    });
  } else {
    // Desktop events
    freshRpsButtons.forEach(function(b) {
      b.addEventListener('click', function() {
        if (window.soundController) {
          window.soundController.forceAudioUnlock();
        }
        if (b.dataset.move) playRound(b.dataset.move);
      });
    });
    
    freshStartButton.addEventListener('click', function() { 
      if (window.soundController) {
        window.soundController.forceAudioUnlock();
      }
      if (gameState === 'title') {
        startRound();
      }
    });
    
    freshResetButton.addEventListener('click', function() {
      if (window.soundController) {
        window.soundController.forceAudioUnlock();
      }
      showTitleScreen();
    });
  }
}

// Initialize everything
function initGame() {
  // Initialize mobile or desktop controls
  if (isMobile) {
    console.log("Initializing for mobile (no 3D effects)");
    initMobileControls();
  } else {
    console.log("Initializing for desktop (with 3D parallax)");
    initDesktopParallax();
  }
  
  // Initialize buttons
  initButtons();
  
  // Start title screen
  if (document.fonts) {
    document.fonts.load('1em "Archivo Black"').then(showTitleScreen);
  } else {
    showTitleScreen();
  }
  
  console.log("Game initialized");
}

// Make sure DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}