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
  // Updated to Archivo Black for consistent heavy look on mobile
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
    ctx.drawImage(buffer, x, 0, slice, buffer.height, x, yOffset, slice, buffer.height);
  }
  t += 0.04;
  animId = requestAnimationFrame(drawTitle);
}

/* ======================
   GAME FLOW
   ====================== */
function showTitleScreen() {
  clearTimers();
  gameState = 'title';
  setRPSButtons(false);
  titleCanvas.style.display = 'block';
  drawTitleText();
  drawTitle();
  screenText.innerHTML = "Rock Paper Scissors!<br><br><span class='blink'>Press Start</span>";
  blinkInterval = setInterval(function() {
    var el = document.querySelector('.blink');
    if (el) el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }, 800);
}

function renderDots(n) {
  screenText.textContent = (n >= 1 ? '● ' : '○ ') + (n >= 2 ? '● ' : '○ ') + (n >= 3 ? '●' : '○');
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
    screenText.textContent = 'FORFEIT';
    setTimeout(startRound, ROUND_PAUSE);
  } else {
    resolveRound(playerMove);
  }
}

function resolveRound(move) {
  var cpu = moves[Math.floor(Math.random() * moves.length)];
  var result = 'draw';
  if ((move === 'rock' && cpu === 'scissors') || (move === 'paper' && cpu === 'rock') || (move === 'scissors' && cpu === 'paper')) {
    result = 'win';
  } else if (move !== cpu) {
    result = 'lose';
  }

  if (result === 'win') screenText.innerHTML = '○<br>WIN';
  else if (result === 'lose') screenText.innerHTML = '✕<br>LOSE';
  else screenText.innerHTML = '□<br>DRAW';

  setTimeout(startRound, ROUND_PAUSE);
}

/* ======================
   INPUTS
   ====================== */
rpsButtons.forEach(function(b) {
  b.addEventListener('click', function() {
    if (gameState !== 'countdown' || playerMove) return;
    playerMove = b.dataset.move;
    setRPSButtons(false);
  });
});

startButton.addEventListener('click', function() {
  if (gameState === 'title') startRound();
});

resetButton.addEventListener('click', function() {
  showTitleScreen();
});

/* ======================
   TILT EFFECT
   ====================== */
var MAX_TILT = 6;
var targetX = 0, targetY = 0, currentX = 0, currentY = 0;

function tiltLoop() {
  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;
  device.style.transform = 'rotateX(' + currentX + 'deg) rotateY(' + currentY + 'deg)';
  requestAnimationFrame(tiltLoop);
}

if (device) {
  tiltLoop();
  device.addEventListener('mousemove', function(e) {
    var rect = device.getBoundingClientRect();
    var cx = rect.width / 2, cy = rect.height / 2;
    targetX = ((e.clientY - rect.top - cy) / cy) * -MAX_TILT;
    targetY = ((e.clientX - rect.left - cx) / cx) * MAX_TILT;
  });

  device.addEventListener('touchmove', function(e) {
    if (e.touches.length > 0) {
      var touch = e.touches[0];
      var rect = device.getBoundingClientRect();
      var cx = rect.width / 2, cy = rect.height / 2;
      targetX = ((touch.clientY - rect.top - cy) / cy) * -MAX_TILT;
      targetY = ((touch.clientX - rect.left - cx) / cx) * MAX_TILT;
    }
  }, { passive: false });

  device.addEventListener('mouseleave', function() { targetX = 0; targetY = 0; });
  device.addEventListener('touchend', function() { targetX = 0; targetY = 0; });
}

showTitleScreen();