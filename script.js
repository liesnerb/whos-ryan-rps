/* ============================================================
   DOM REFERENCES & SETUP
   ============================================================ */
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

/* ============================================================
   GAME CONFIG
   ============================================================ */
var COUNTDOWN_SPEED = 500;
var REVEAL_DELAY = 800;
var ROUND_PAUSE = 1500;
var moves = ['rock', 'paper', 'scissors'];

var gameState = 'title', timeLeft = 3, playerMove = null;
var countdownInterval, animId, t = 0, roundTimeout;

/* ============================================================
   3D PARALLAX VARIABLES
   ============================================================ */
var rotateX = 0, rotateY = 0;
var targetRotateX = 0, targetRotateY = 0;
var MAX_TILT = 8;
var PARALLAX_FACTOR = 0.2;
var SMOOTHING = 0.1;

/* ============================================================
   3D PARALLAX SYSTEM (MOBILE + DESKTOP)
   ============================================================ */
function init3DParallax() {
  const supportsPointer = window.PointerEvent;

  if (supportsPointer) {
    deviceWrapper.addEventListener('pointermove', handlePointerMove);
    deviceWrapper.addEventListener('pointerleave', resetTilt);
  } else {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', resetTilt);
    deviceWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    deviceWrapper.addEventListener('touchend', resetTilt);
  }

  // Optional gyro tilt
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function (event) {
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;
      targetRotateX = clamp(beta / 45, -1, 1) * MAX_TILT;
      targetRotateY = clamp(gamma / 45, -1, 1) * MAX_TILT;
    });
  }

  requestAnimationFrame(updateParallax);
}

function handlePointerMove(e) {
  var rect = deviceWrapper.getBoundingClientRect();
  var centerX = rect.left + rect.width / 2;
  var centerY = rect.top + rect.height / 2;
  var normalizedX = (e.clientX - centerX) / (rect.width / 2);
  var normalizedY = (e.clientY - centerY) / (rect.height / 2);
  targetRotateY = clamp(normalizedX, -1, 1) * MAX_TILT;
  targetRotateX = -clamp(normalizedY, -1, 1) * MAX_TILT;
}

function handleMouseMove(e) {
  handlePointerMove(e);
}

function handleTouchMove(e) {
  e.preventDefault();
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

/* ============================================================
   REACTIVE SCREEN GLOSS
   ============================================================ */
function updateScreenGloss(rotateX, rotateY) {
  const screen = document.querySelector('.screen');
  if (!screen) return;

  const maxRotation = 15;
  let posX = (rotateY / maxRotation) * 100;
  let posY = (-rotateX / maxRotation) * 100;

  posX = Math.max(Math.min(posX, 100), -100);
  posY = Math.max(Math.min(posY, 100), -100);

  const cssPosX = 50 + (posX / 2);
  const cssPosY = 50 + (posY / 2);
  const intensity = 0.3 + (Math.abs(rotateX) + Math.abs(rotateY)) * 0.01;
  const angle = 135 + (rotateY * 0.5);

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
  const oldStyle = document.getElementById('dynamic-gloss');
  if (oldStyle) oldStyle.remove();
  style.id = 'dynamic-gloss';
  document.head.appendChild(style);
}

/* ============================================================
   PARALLAX UPDATE LOOP
   ============================================================ */
function updateParallax() {
  rotateX += (targetRotateX - rotateX) * SMOOTHING;
  rotateY += (targetRotateY - rotateY) * SMOOTHING;

  if (device) {
    device.style.transform = `
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;
  }

  applyLayerParallax();
  updateScreenGloss(rotateX, rotateY);
  requestAnimationFrame(updateParallax);
}

function applyLayerParallax() {
  var layers = document.querySelectorAll('.layer, .screen, button');
  layers.forEach(function (layer) {
    var depth = 0;

    if (layer.classList.contains('shell')) depth = 0;
    else if (layer.classList.contains('embossed')) depth = 6;
    else if (layer.classList.contains('buttons')) depth = 10;
    else if (layer.classList.contains('logo')) depth = 14;
    else if (layer.classList.contains('rps')) depth = 15;
    else if (layer.classList.contains('screen-art')) depth = 22;
    else if (layer.classList.contains('light')) depth = 30;
    else if (layer.classList.contains('screen')) depth = 18;
    else if (layer.tagName === 'BUTTON') depth = 40;

    var parallaxMultiplier = depth / 100;
    var offsetX = rotateY * parallaxMultiplier * PARALLAX_FACTOR * 10;
    var offsetY = -rotateX * parallaxMultiplier * PARALLAX_FACTOR * 10;
    var baseZ = depth + 'px';

    layer.style.transform = `translate3d(${offsetX}px, ${offsetY}px, ${baseZ})`;
  });
}

/* ============================================================
   TITLE RENDERING
   ============================================================ */
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

/* ============================================================
   GAME LOGIC
   ============================================================ */
function renderDots(n) {
  screenText.innerHTML = '';
  var container = document.createElement('div');
  container.className = 'dots-container';
  for (var i = 1; i <= 3; i++) {
    var dot = document.createElement('span');
    dot.className = 'dot' + (i <= n ? ' filled' : '');
    container.appendChild(dot);
  }
  screenText.appendChild(container);

  if (n < 3 && window.soundController) {
    window.soundController.playCountdownTick();
  }
}

function showTitleScreen() {
  clearInterval(countdownInterval);
  cancelAnimationFrame(animId);
  clearTimeout(roundTimeout); // ✅ Prevent leftover game restart
  gameState = 'title';
  titleCanvas.style.display = 'block';
  screenText.innerHTML = "<span class='blink'>PRESS START</span>";
  drawTitleText();
  drawTitle();
}

function startRound() {
  cancelAnimationFrame(animId);
  gameState = 'countdown';
  timeLeft = 3;
  playerMove = null;
  titleCanvas.style.display = 'none';
  renderDots(timeLeft);
  countdownInterval = setInterval(function () {
    timeLeft--;
    renderDots(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      if (!playerMove) {
        screenText.innerHTML = 'FORFEIT';
        if (window.soundController) {
          window.soundController.playForfeitSound();
        }
        roundTimeout = setTimeout(startRound, ROUND_PAUSE); // ✅ stored timeout
      }
    }
  }, COUNTDOWN_SPEED);
}

function playRound(move) {
  if (gameState !== 'countdown' || playerMove || timeLeft <= 0) return;
  playerMove = move;
  clearInterval(countdownInterval);
  screenText.innerHTML = '...';
  setTimeout(function () {
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
  roundTimeout = setTimeout(startRound, ROUND_PAUSE); // ✅ stored timeout
}

/* ============================================================
   CONTROLS & INIT
   ============================================================ */
rpsButtons.forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.move) playRound(b.dataset.move);
  });
});

startButton.addEventListener('click', function () {
  if (gameState === 'title') {
    if (window.soundController) {
      window.soundController.unlockAudio();
    }
    startRound();
  }
});

resetButton.addEventListener('click', showTitleScreen);

/* ============================================================
   INIT
   ============================================================ */
function initGame() {
  init3DParallax();

  if (document.fonts) {
    document.fonts.load('1em "Archivo Black"').then(showTitleScreen);
  } else {
    showTitleScreen();
  }

  console.log("Game initialized with mobile-ready 3D parallax + fixed reset behavior.");
}

window.addEventListener('DOMContentLoaded', initGame);
