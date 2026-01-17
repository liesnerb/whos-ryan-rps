/* ======================
   DOM REFERENCES
   ====================== */

const screenText = document.querySelector('.screen-text');
const rpsButtons = document.querySelectorAll('.btn');
const startButton = document.querySelector('.btn-start');
const resetButton = document.querySelector('.btn-reset');
const device = document.querySelector('.device');

const titleCanvas = document.getElementById('titleCanvas');
const ctx = titleCanvas.getContext('2d');

/* Canvas size */
titleCanvas.width = 160;
titleCanvas.height = 36;

/* ======================
   GAME CONFIG
   ====================== */

const COUNTDOWN_SPEED = 600;
const ROUND_PAUSE = 1200;
const moves = ['rock', 'paper', 'scissors'];

/* ======================
   STATE
   ====================== */

let gameState = 'title';
let timeLeft = 3;
let playerMove = null;
let countdownInterval = null;
let blinkInterval = null;
let animId = null;
let t = 0;

/* ======================
   UTILS
   ====================== */

function clearTimers() {
  clearInterval(countdownInterval);
  clearInterval(blinkInterval);
  cancelAnimationFrame(animId);
}

function setRPSButtons(enabled) {
  rpsButtons.forEach(b => {
    b.style.pointerEvents = enabled ? 'auto' : 'none';
  });
}

/* ======================
   TITLE CANVAS
   ====================== */

const buffer = document.createElement('canvas');
const bctx = buffer.getContext('2d');
buffer.width = titleCanvas.width;
buffer.height = titleCanvas.height;

function rand(seed) {
  return Math.sin(seed * 999) * 10000 % 1;
}

function drawTitleText() {
  bctx.clearRect(0, 0, buffer.width, buffer.height);
  bctx.fillStyle = '#121e12';
  bctx.font = '900 20px Arial Black';
  bctx.textBaseline = 'middle';
  bctx.textAlign = 'center';
  bctx.fillText("WHO'S RYAN", buffer.width / 2, buffer.height / 2);
}

function drawTitle() {
  ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

  const slice = 3;
  const breakWidth = 50;
  const margin = 40;

  const sweep =
    (Math.cos(t * 0.6) * -0.5 + 0.5) *
    (titleCanvas.width + margin * 2) - margin;

  for (let x = 0; x < titleCanvas.width; x += slice) {
    const dist = Math.abs(x - sweep);
    let yOffset = 0;

    if (dist < breakWidth) {
      const strength = 1 - dist / breakWidth;
      const step = Math.floor((x + t * 40) / 10);
      const noise = rand(step);

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

  screenText.innerHTML =
    "Rock Paper Scissors!<br><br>" +
    "<span class='blink'>Press Start</span>";

  blinkInterval = setInterval(() => {
    const el = document.querySelector('.blink');
    if (el) {
      el.style.visibility =
        el.style.visibility === 'hidden' ? 'visible' : 'hidden';
    }
  }, 800);
}

/* ======================
   GAME FLOW
   ====================== */

function renderDots(n) {
  screenText.textContent =
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

  countdownInterval = setInterval(() => {
    timeLeft--;
    renderDots(timeLeft);
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
  const cpu = moves[Math.floor(Math.random() * moves.length)];
  let result = 'draw';

  if (
    (move === 'rock' && cpu === 'scissors') ||
    (move === 'paper' && cpu === 'rock') ||
    (move === 'scissors' && cpu === 'paper')
  ) result = 'win';
  else if (move !== cpu) result = 'lose';

  if (result === 'win') screenText.innerHTML = '○<br>WIN';
  else if (result === 'lose') screenText.innerHTML = '✕<br>LOSE';
  else screenText.innerHTML = '□<br>DRAW';

  setTimeout(startRound, ROUND_PAUSE);
}

/* ======================
   INPUT
   ====================== */

rpsButtons.forEach(b => {
  b.addEventListener('click', () => {
    if (gameState !== 'countdown' || playerMove) return;
    playerMove = b.dataset.move;
    setRPSButtons(false);
  });
});

startButton.addEventListener('click', () => {
  if (gameState === 'title') startRound();
});

resetButton.addEventListener('click', showTitleScreen);

/* ======================
   STABLE TILT (SAFE)
   ====================== */

const MAX_TILT = 6;
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

function tiltLoop() {
  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  device.style.transform =
    `rotateX(${currentX}deg) rotateY(${currentY}deg)`;

  requestAnimationFrame(tiltLoop);
}
tiltLoop();

device.addEventListener('mousemove', e => {
  const rect = device.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const cx = rect.width / 2;
  const cy = rect.height / 2;

  targetX = ((y - cy) / cy) * -MAX_TILT;
  targetY = ((x - cx) / cx) * MAX_TILT;
});

device.addEventListener('mouseleave', () => {
  targetX = 0;
  targetY = 0;
});

/* ======================
   BOOT
   ====================== */

showTitleScreen();
