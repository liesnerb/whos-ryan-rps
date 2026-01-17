/* ======================
   DOM REFERENCES
   ====================== */

var screenText = document.querySelector('.screen-text');
var rpsButtons = document.querySelectorAll('.btn');
var startButton = document.querySelector('.btn-start');
var resetButton = document.querySelector('.btn-reset');
var device = document.querySelector('.device');

var titleCanvas = document.getElementById('titleCanvas');
var ctx = titleCanvas.getContext('2d');

/* Canvas size */
titleCanvas.width = 160;
titleCanvas.height = 36;

/* ======================
   GAME CONFIG
   ====================== */

var COUNTDOWN_SPEED = 600;
var ROUND_PAUSE = 1200;
var moves = ['rock', 'paper', 'scissors'];

/* ======================
   STATE
   ====================== */

var gameState = 'title';
var timeLeft = 3;
var playerMove = null;
var countdownInterval = null;
var blinkInterval = null;
var animId = null;
var t = 0;

// Gyroscope tracking
var MAX_TILT = 6;
var targetX = 0, targetY = 0;
var currentX = 0, currentY = 0;
var gyroEnabled = false;

/* ======================
   UTILS
   ====================== */

function clearTimers() {
  clearInterval(countdownInterval);
  clearInterval(blinkInterval);
  cancelAnimationFrame(animId);
}

function setRPSButtons(enabled) {
  rpsButtons.forEach(function(b) {
    b.style.pointerEvents = enabled ? 'auto' : 'none';
  });
}

/* ======================
   GYROSCOPE CONTROL
   ====================== */

function requestGyroPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    
    // iOS 13+ requires permission
    DeviceOrientationEvent.requestPermission()
      .then(function(state) {
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleGyro);
          gyroEnabled = true;
        } else {
          console.log('Gyroscope permission denied');
          setupMouseTilt(); // Fallback to mouse tilt
        }
      })
      .catch(function(error) {
        console.log('Gyroscope permission error:', error);
        setupMouseTilt(); // Fallback to mouse tilt
      });
  } else {
    // Non-iOS devices
    window.addEventListener('deviceorientation', handleGyro);
    gyroEnabled = true;
  }
}

function handleGyro(e) {
  if (!e.beta || !e.gamma) return;
  
  // beta: front back (-180, 180), gamma: left right (-90, 90)
  // Invert beta for more natural tilt
  var beta = e.beta || 0;
  var gamma = e.gamma || 0;
  
  // Normalize and invert for more intuitive movement
  targetX = (beta / 15) * -1; // Reduced sensitivity
  targetY = (gamma / 15);
  
  // Clamp to MAX_TILT
  targetX = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetX));
  targetY = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetY));
}

function setupMouseTilt() {
  // Fallback to mouse movement on desktop
  device.addEventListener('mousemove', function(e) {
    var rect = device.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    
    // Calculate mouse position relative to center
    var relX = e.clientX - rect.left - cx;
    var relY = e.clientY - rect.top - cy;
    
    // Normalize and apply tilt
    targetX = (relY / cy) * -MAX_TILT;
    targetY = (relX / cx) * MAX_TILT;
  });

  device.addEventListener('mouseleave', function() {
    targetX = 0;
    targetY = 0;
  });
}

function tiltLoop() {
  // Smooth interpolation
  currentX += (targetX - currentX) * 0.1;
  currentY += (targetY - currentY) * 0.1;
  
  // Apply 3D transform with perspective
  device.style.transform = 
    'perspective(1000px) ' +
    'rotateX(' + currentX + 'deg) ' +
    'rotateY(' + currentY + 'deg) ' +
    'translateZ(0)';
  
  requestAnimationFrame(tiltLoop);
}

/* ======================
   TITLE CANVAS
   ====================== */

var buffer = document.createElement('canvas');
var bctx = buffer.getContext('2d');
buffer.width = titleCanvas.width;
buffer.height = titleCanvas.height;

function rand(seed) {
  return Math.sin(seed * 999) * 10000 % 1;
}

function drawTitleText() {
  bctx.clearRect(0, 0, buffer.width, buffer.height);
  bctx.fillStyle = '#121e12';
  // Use Archivo Black for mobile consistency
  bctx.font = '900 20px "Archivo Black", sans-serif';
  bctx.textBaseline = 'middle';
  bctx.textAlign = 'center';
  bctx.fillText("WHO'S RYAN", buffer.width / 2, buffer.height / 2);
}

function drawTitle() {
  ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

  var slice = 3;
  var breakWidth = 50;
  var margin = 40;

  var sweep = (Math.cos(t * 0.6) * -0.5 + 0.5) * (titleCanvas.width + margin * 2) - margin;

  for (var x = 0; x < titleCanvas.width; x += slice) {
    var dist = Math.abs(x - sweep);
    var yOffset = 0;

    if (dist < breakWidth) {
      var strength = 1 - dist / breakWidth;
      var step = Math.floor((x + t * 40) / 10);
      var noise = rand(step);

      yOffset = (noise - 0.5) * strength * 6;
      yOffset += Math.sin(t * 0.8) * 0.6;
    }

    ctx.drawImage(
      buffer,
      x, 0, slice, buffer.height,
      x, yOffset,
      slice, buffer.height
    );
  }

  t += 0.04;
  animId = requestAnimationFrame(drawTitle);
}

/* ======================
   TITLE SCREEN
   ====================== */

function showTitleScreen() {
  clearTimers();
  gameState = 'title';
  setRPSButtons(false);

  titleCanvas.style.display = 'block';
  drawTitleText();
  drawTitle();

  screenText.innerHTML = "Rock Paper Scissors!<br><br>" +
    "<span class='blink'>Press Start</span>";

  blinkInterval = setInterval(function() {
    var el = document.querySelector('.blink');
    if (el) {
      el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
    }
  }, 800);
}

/* ======================
   GAME FLOW
   ====================== */

function renderDots(n) {
  // Use innerHTML to clear out previous result tags
  screenText.innerHTML = 
    (n >= 1 ? '● ' : '○ ') +
    (n >= 2 ? '● ' : '○ ') +
    (n >= 3 ? '●' : '○');
}

function startRound() {
  clearTimers();
  gameState = 'countdown';
  timeLeft = 3;
  playerMove = null;

  titleCanvas.style.display = 'none';
  setRPSButtons(true);
  renderDots(timeLeft);

  countdownInterval = setInterval(function() {
    timeLeft--;
    renderDots(timeLeft);
    
    if (window.soundController && window.soundController.playTickSound) {
      window.soundController.playTickSound();
    }
    
    if (timeLeft === 0) endCountdown();
  }, COUNTDOWN_SPEED);
}

function endCountdown() {
  clearInterval(countdownInterval);
  setRPSButtons(false);

  if (!playerMove) {
    screenText.innerHTML = 'FORFEIT';
    setTimeout(startRound, ROUND_PAUSE);
  } else {
    resolveRound(playerMove);
  }
}

function resolveRound(move) {
  var cpu = moves[Math.floor(Math.random() * moves.length)];
  var result = 'draw';

  if (
    (move === 'rock' && cpu === 'scissors') ||
    (move === 'paper' && cpu === 'rock') ||
    (move === 'scissors' && cpu === 'paper')
  ) {
    result = 'win';
  } else if (move !== cpu) {
    result = 'lose';
  }

  if (result === 'win') {
    screenText.innerHTML = '○<br>WIN';
  } else if (result === 'lose') {
    screenText.innerHTML = '✕<br>LOSE';
  } else {
    screenText.innerHTML = '□<br>DRAW';
  }

  setTimeout(startRound, ROUND_PAUSE);
}

/* ======================
   INPUT
   ====================== */

rpsButtons.forEach(function(b) {
  b.addEventListener('click', function() {
    if (gameState !== 'countdown' || playerMove) return;
    playerMove = b.dataset.move;
    setRPSButtons(false);
    screenText.innerHTML = "WAITING...";
  });
});

startButton.addEventListener('click', function() {
  if (gameState === 'title') startRound();
});

resetButton.addEventListener('click', function() {
  showTitleScreen();
});

/* ======================
   INITIALIZATION
   ====================== */

// Start tilt animation loop
if (device) {
  tiltLoop();
  
  // Request gyro permission on page load
  requestGyroPermission();
  
  // Also setup mouse fallback immediately
  setupMouseTilt();
}

// Wait for fonts to load before showing title
if (document.fonts) {
  document.fonts.load('1em "Archivo Black"').then(showTitleScreen);
} else {
  showTitleScreen();
}