/* ======================
   DOM REFERENCES & SETUP
   ====================== */
var screenText = document.querySelector('.screen-text');
var rpsButtons = document.querySelectorAll('.btn');
var startButton = document.querySelector('.btn-start');
var resetButton = document.querySelector('.btn-reset');
var device = document.querySelector('.device');
var titleCanvas = document.getElementById('titleCanvas');
var ctx = titleCanvas.getContext('2d');
titleCanvas.width = 160;
titleCanvas.height = 36;

var COUNTDOWN_SPEED = 600;
var ROUND_PAUSE = 1200;
var moves = ['rock', 'paper', 'scissors'];

var gameState = 'title', timeLeft = 3, playerMove = null;
var countdownInterval, blinkInterval, animId, t = 0;

/* ======================
   TITLE RENDERING
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
  // Clear ALL content completely
  screenText.innerHTML = '';
  screenText.style.opacity = '1';
  
  var dots = (n >= 1 ? '● ' : '○ ') + (n >= 2 ? '● ' : '○ ') + (n >= 3 ? '●' : '○');
  screenText.textContent = dots;
}

function showTitleScreen() {
  clearInterval(countdownInterval);
  clearInterval(blinkInterval);
  cancelAnimationFrame(animId);
  gameState = 'title';
  titleCanvas.style.display = 'block';
  drawTitleText();
  drawTitle();
  screenText.innerHTML = "Rock Paper Scissors!<br><br><span class='blink'>Press Start</span>";
  blinkInterval = setInterval(function() {
    var el = document.querySelector('.blink');
    if (el) el.style.visibility = el.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }, 800);
}

function startRound() {
  clearInterval(blinkInterval);
  cancelAnimationFrame(animId);
  gameState = 'countdown';
  timeLeft = 3;
  playerMove = null;
  titleCanvas.style.display = 'none';
  
  // Clear the screen completely
  screenText.innerHTML = '';
  screenText.style.opacity = '1';
  
  // Add a tiny delay to ensure DOM updates before rendering dots
  setTimeout(() => {
    renderDots(timeLeft);
  }, 10);
  
  countdownInterval = setInterval(function() {
    timeLeft--;
    renderDots(timeLeft);
    if (window.soundController) window.soundController.playTickSound();
    
    if (timeLeft === 0) {
      clearInterval(countdownInterval);
      if (!playerMove) {
        screenText.innerHTML = 'FORFEIT';
        setTimeout(startRound, ROUND_PAUSE);
      } else {
        resolveRound(playerMove);
      }
    }
  }, COUNTDOWN_SPEED);
}

function resolveRound(move) {
  var cpu = moves[Math.floor(Math.random() * moves.length)];
  var resultHTML = "";
  
  if (move === cpu) resultHTML = '□<br>DRAW';
  else if ((move === 'rock' && cpu === 'scissors') || 
           (move === 'paper' && cpu === 'rock') || 
           (move === 'scissors' && cpu === 'paper')) {
    resultHTML = '○<br>WIN';
  } else {
    resultHTML = '✕<br>LOSE';
  }
  
  screenText.innerHTML = resultHTML;
  setTimeout(startRound, ROUND_PAUSE);
}

/* ======================
   CONTROLS & INIT
   ====================== */
rpsButtons.forEach(function(b) {
  b.addEventListener('click', function() {
    if (gameState === 'countdown' && !playerMove) {
        playerMove = b.dataset.move;
        screenText.innerHTML = "WAITING...";
    }
  });
});

startButton.addEventListener('click', function() { if (gameState === 'title') startRound(); });
resetButton.addEventListener('click', showTitleScreen);

if (document.fonts) {
  document.fonts.load('1em "Archivo Black"').then(showTitleScreen);
} else {
  showTitleScreen();
}