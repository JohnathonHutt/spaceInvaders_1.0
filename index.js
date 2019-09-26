//jshint esversion:6

//constants and variables
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

//images
const playerShip = new Image();
playerShip.src = "images/playerShip.png";

const alienShip = new Image();
alienShip.src = "images/alienShipwExplosion.png";

const background = new Image();
background.src = "images/pixelStarScape.png";

const alienImage = new Image();
alienImage.src = "images/alien.png";

const alienRedImage = new Image();
alienRedImage.src = "images/alienRedWithExplosion.png";

const ship = {
  x: canvas.width / 2 - 32,
  y: canvas.height - 70
};

const lasers = [];
let aliens = [];
const alienLasers = [];
//motherShip bombs
let bombs = [];

let counter = 0;
let frameRate = 60 / 4;
let playerShipFrame = 0;
//used in alien animations
let frame = 1;
//used in more precisely named animations
let explFrame = 0;
let alienShipFrame = 0;
let alienMotherShipExplFrame = 7;

//flag for motherShip
let isAlienShipOut = false;

//width and height of animation frames, used in draw functions
const w = 32;
const h = 32;

//game state values
const gst = {
  lives: 3,
  score: 0,
  isGameOver: false,
  round: 1
};

const alien = {
  colCount: 9,
  rowCount: 4,
  totAliens: 9 * 4,
  h: 20,
  w: 32,
  pTop: 18,
  pSides: 6,
  offSetTop: 12,
  offSetLeft: 18,
  speedX: 17,
  speedY: 60
};

const shield = {
  // isActive: true,
  status: 3,
  x: 218,
  y: canvas.height - 76 - 12,
  w: 64,
  h: 12,
  color: ['rgb(220, 220, 255)', 'rgb(120, 120, 255)', 'rgb(0, 0, 255)']
};

//alien mother ship
let motherShip = {
  isInitialized: false,
  status: 3,
  explInitialized: false,
  explComplete: false
};

//flag for initializing mother ship once per round only
let initializedThisRound = false;

let mShipBombingPatterns = {
  3: [100, 300, 400],
  4: [40, 252, 320, 430],
  5: [44, 68, 92, 408, 432],
  6: [40, 240, 252, 290, 330, 370]
};

//plays sounds...
function playSound(name) {
  var audio = new Audio("sounds/" + name);
  audio.play();
}

//event handlers
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
//separated laser fire and directions so that they can work simultaneously
document.addEventListener('keydown', laserDownHandler, false);
document.addEventListener('keyup', laserUpHandler, false);

let rPressed = false;
let lPressed = false;
//flag prevents holding down for rapid fire
let laserCharged = true;

function keyDownHandler(e) {
  switch (e.keyCode) {
    case 39:
      rPressed = true;
      break;
    case 37:
      lPressed = true;
      break;
    default:
      console.log(e.keyCode);
  }
}

function keyUpHandler(e) {
  switch (e.keyCode) {
    case 39:
      rPressed = false;
      break;
    case 37:
      lPressed = false;
      break;
    default:
      console.log(e.keyCode);
  }
}

function laserDownHandler(e) {
  switch (e.keyCode) {
    case 38:
      newLaser();
      break;
    case 32:
      newLaser();
      break;
    default:
      console.log(e.keyCode);
  }
}

function laserUpHandler(e) {
  switch (e.keyCode) {
    case 38:
      laserCharged = true;
      break;
    case 32:
      laserCharged = true;
      break;
    default:
      console.log(e.keyCode);
  }
}

function newLaser() {
  if (laserCharged) {
    console.log('went through the laser pressed pathway');
    if (shield.status > 0) {
      if (ship.x+30 < shield.x || ship.x+30 > shield.x + shield.w) {
        fireLaser();
      }
    } else {
      fireLaser();
    }
  }
  laserCharged = false;
}

function fireLaser() {
  //newLaser helper functions
  lasers.unshift({
    x: ship.x + 30,
    y: ship.y,
    w: 4,
    h: 8
  });
  playSound('laser.m4a');
}

function populateAlienArr(x, y) {
  //populates global aliens array w/ alien objects - called once
  //accesses global aliens array
  //set x and y for later uses when aliens start offscreen
  if (!motherShip.isInitialized) {
    let alienX = x + alien.offSetLeft;
    let alienY = y + alien.offSetTop;
    for (let i = 0; i < alien.totAliens; i++) {
      aliens.push({
        x: alienX,
        y: alienY,
        status: 2,
        expl: 20,
        dir: 'r',
      });
      if ((i + 1) % alien.colCount === 0) {
        alienX = alien.offSetLeft;
        alienY += (alien.h + alien.pTop);
      } else {
        alienX += (alien.w + alien.pSides);
      }
    }
  }
}

populateAlienArr(0, 0);

//functions used in update()
function newAlienLaser() {
  let rand = Math.random();
  if (rand > 0.8) {
    if (aliens.length > 0) {
      let num;
      (aliens.length < 8) ? num = aliens.length: num = 8;
      let random = Math.floor(Math.random() * num);
      // console.log(random);
      let firingAlien = aliens[aliens.length - (random + 1)];
      // console.log(firingAlien);
      alienLasers.push({
        x: firingAlien.x,
        y: firingAlien.y,
        w: 4,
        h: 8
      });
      playSound('fire.wav');
    }
  }
}

function increaseAlienSpeed() {
  alien.speedX += 2;
  alien.speedY += 2;
}

function moveShip(dt) {
  //check right
  if (rPressed) {
    if (ship.x + 64 >= canvas.width) {
      ship.x = canvas.width - 64;
    } else {
      ship.x += 60 / dt;
    }
  }
  //check left
  if (lPressed) {
    if (ship.x <= 0) {
      ship.x = 0;
    } else {
      ship.x -= 60 / dt;
    }
  }
}

function moveAliens(dt) {
  //looks for aliens close to edges - changes directions if close
  if (dt > 0) {
    let nearAnEdge = false;
    for (let i = 0; i < aliens.length; i++) {
      //iterate through aliens array check if any are near edge
      if (aliens[i].x + 33 >= canvas.width || aliens[i].x <= 1) {
        nearAnEdge = true;
        break;
      }
    }
    //if near edge switch dir + move, else just move
    if (nearAnEdge) {
      for (let j = 0; j < aliens.length; j++) {
        if (aliens[j].status > 0) {
          //change directions
          (aliens[j].dir === 'r') ? aliens[j].dir = 'l': aliens[j].dir = 'r';
          //move aliens/drop down
          if (aliens[j].dir === 'r') {
            aliens[j].x += alien.speedX / dt;
            aliens[j].y += alien.speedY / dt;
            //fix to stop aliens from getting trapped by the wall
            if (aliens[j].x <= 1) {
              aliens[j].x = 2;
            }
          } else if (aliens[j].dir === 'l') {
            aliens[j].x -= alien.speedX / dt;
            aliens[j].y += alien.speedY / dt;
            if (aliens[j].x + 33 >= canvas.width) {
              aliens[j].x = canvas.width - 34;
            }
          }
        }
      }
    } else {
      for (let k = 0; k < aliens.length; k++) {
        if (aliens[k].status > 0) {
          // (aliens[k].dir === 'r') ? aliens[k].x += 1: aliens[k].x -= 1;
          if (aliens[k].dir === 'r') {
            aliens[k].x += alien.speedX / dt;
          } else {
            aliens[k].x -= alien.speedX / dt;
          }
        }
      }
    }
  }
}

function moveLasers(dt) {
  for (let i = 0; i < lasers.length; i++) {
    if (lasers[i].y < 0) {
      lasers.splice(i, 1);
    } else {
      lasers[i].y -= 65 / dt;
    }
  }
}

function moveAlienLasers(dt) {
  for (let i = 0; i < alienLasers.length; i++) {
    if (alienLasers[i].y > canvas.height) {
      alienLasers.splice(i, 1);
    } else {
      alienLasers[i].y += 50 / dt;
    }
  }
}

function alienCollisionDetection() {
  for (let i = 0; i < lasers.length; i++) {
    let l = lasers[i];
    //check motherShip collision if ship is out and if laser is at bottom of ship
    if (motherShip.isInitialized && l.y < 64) {
      if (l.x > motherShip.x && l.x < motherShip.x + 64) {
        lasers.splice(i, 1);
        motherShip.status--;
        console.log('You hit the motherShip');
        if (motherShip.status < 1) {
          gst.score += 100;
          motherShip.isInitialized = false;
          gst.lives++;
          playSound('extraGuy.wav');
          //explosion exploAnimation
          if (!motherShip.explInitialized) {
            alienMotherShipExplFrame = 7;
            motherShip.explInitialized = true;
          }
        }
      }
      break;
    }
    if (aliens.length > 0) {
      if (l.y <= aliens[aliens.length - 1].y + alien.h) {
        for (let j = 0; j < aliens.length; j++) {
          if (aliens[j].status > 0 && lasers[i].y >= aliens[j].y && lasers[i].y <= aliens[j].y + alien.h && lasers[i].x + 4 >= aliens[j].x && lasers[i].x <= aliens[j].x + alien.w) {
            if (aliens[j].status === 2) {
              lasers.splice(i, 1);
              aliens[j].status--;
              break;
            } else if (aliens[j].status === 1) {
              lasers.splice(i, 1);
              aliens[j].status -= 1;
              gst.score += 10;
              //increment alien speed with each alien
              increaseAlienSpeed();
              playSound('invaderkilled.wav');
              //activate motherShip
              if (aliens.length < 8 && !initializedThisRound) {
                //initialize motherShip
                initializeMotherShip();
              }
              break;
            } else if (aliens[j].status === 0) {
              //if status is 0, alien stops moving and goes through 20 cycles of explosion animation
              console.log(aliens[j]);
              if (aliens[j].expl === 0) {
                aliens[j].splice(j, 1);
              } else {
                aliens[j].expl -= 1;
              }
            }
          }
        }
      }
    }
  }
}

function initializeMotherShip() {
  //flag limits ship appearances to once / round
  initializedThisRound = true;
  //set isInitialized to true
  let rand = Math.floor(Math.random()*(4))+3;
  playSound('motherShip.wav');
  if (rand%2 === 0) {
    //move from l-r
    motherShip = {
      x: canvas.width,
      status: 3,
      bombPattern: mShipBombingPatterns[rand],
      isInitialized: true,
      dir: 'l',
    };
  } else {
    //move from r-l
    motherShip = {
      x: -64,
      status: 3,
      bombPattern: mShipBombingPatterns[rand],
      isInitialized: true,
      dir: 'r',
    };
  }
}

function shipCollisionDetection() {
  //first laser in arr is lowest/if higher than ship break/else check for collision
  for (let i = 0; i < alienLasers.length; i++) {
    //if shield is active and laser is over shield
    if (shield.status > 0 && alienLasers[i].x + alienLasers[i].w > shield.x && alienLasers[i].x < shield.x + shield.w) {
      if (alienLasers[i].y + alienLasers[i].h >= shield.y) {
        alienLasers.splice(i, 1);
      }
    } else if (alienLasers[i].y < canvas.height - 65) {
      break;
    } else if (alienLasers[i].x + alienLasers[i].w >= ship.x && alienLasers[i].x <= ship.x + 64) {
      gst.lives--;
      if (gst.lives > 0) {
        playSound('bangSmall.wav');
      }
      alienLasers.splice(i, 1);
    }
  }
  if (gst.lives < 1) {
    playSound('explosion.wav');
  }
}

function bombCollisionDetection() {
  if (bombs.length > 0) {
    for (let i = 0; i < bombs.length; i++) {
      if (shield.status > 0 && bombs[i].x + 10 > shield.x && bombs[i].x - 10 < shield.x + shield.w && bombs[i].y + 10 > shield.y) {
        console.log('It hit the shield!');
        playSound('bangLarge.wav');
        bombs.splice(i, 1);
        shield.status--;
      } else if (bombs[i].y + 20 > ship.y && bombs[i].x + 10 > ship.x && bombs[i].x < ship.x + 64) {
        console.log('It hit the ship');
        playSound('bangSmall.wav');
        bombs.splice(i, 1);
        gst.lives--;
      }
    }
  }
}

function gameOverScreen() {
  //stop GAME
  //figure out how
  //add Game over text
  gst.isGameOver = true;
  ctx.font = "32px Arial";
  ctx.fillStyle = "blue";
  ctx.fillText("GAME OVER", 150, canvas.height / 2);
  ctx.font = "28px Arial";
  ctx.fillText("SCORE: " + gst.score, 170, canvas.height/2 + 34);
  //hit a to restart
  document.getElementById('canvas').addEventListener('click', restartGame);
}

function restartGame() {
  //used in drawGameOver
  document.location.reload();
}

function checkForGameOver() {
  if (aliens.length !== 0) {
    if (gst.lives <= 0 || aliens[aliens.length-1].y > canvas.height) { //possibly adjust height for alien getting to the bottom of the screen
      gameOverScreen();
    }
  }
}

function checkForAliensCleared() {
  //makes sure all aliens/mothership are cleared before incrementing round
  if (aliens.length === 0 && !motherShip.isInitialized) {
    gst.round += 1;
    initializedThisRound = false;
    alien.speedX = 20 + (15 * gst.round);
    alien.speedY = 60 + (20 * gst.round);
    populateAlienArr(0, -160);
  }
}

function updateMotherShip() {
    if ((motherShip.x > -65 && motherShip.isInitialized) && (motherShip.x < canvas.width+1 && motherShip.isInitialized)) {
      if (motherShip.dir === 'r') {
        motherShip.x += 2;
      } else {
        motherShip.x -= 2;
      }
      //drop bombs
      for (let i = 0; i < motherShip.bombPattern.length; i++) {
        if (motherShip.status > 0 && motherShip.bombPattern[i] === motherShip.x) {
          bombs.push({
            x: motherShip.x + 22,
            y: 54
          });
        }
      }
    } else {
      //off screen - turn off isInitialized
      motherShip.isInitialized = false;
    }
}

function updateMotherShipExpl() {
  if (alienMotherShipExplFrame === 11 && motherShip.explInitialized) {
    motherShip.explComplete = true;
    motherShip.explInitialized = false;
    console.log('It hit that point');
  }
}

function moveBombs(dt) {
  if (bombs.length > 0) {
    for (let i = 0; i < bombs.length; i++) {
      bombs[i].y += 100/dt;
      if (bombs[i].y + 10 > canvas.height) {
        bombs.splice(i, 1);
      }
    }
  }
}

function update(dt) {
  counter += 1;
  if (counter % frameRate === 0) {
    (playerShipFrame === 1) ? playerShipFrame = 0 : playerShipFrame += 1;
    (frame === 9) ? frame = 0: frame += 1;
    (explFrame == 1) ? explFrame = 0: explFrame += 1;
    (alienShipFrame === 6) ? alienShipFrame = 0 : alienShipFrame += 1;
    (alienMotherShipExplFrame === 12) ? alienMotherShipExplFrame = 7 : alienMotherShipExplFrame +=1;
    //increase speed based on number of aliens left
    newAlienLaser();
  }
  moveShip(dt);
  moveAliens(dt);
  moveLasers(dt);
  moveBombs(dt);
  moveAlienLasers(dt);
  alienCollisionDetection();
  shipCollisionDetection();
  bombCollisionDetection();
  checkForGameOver();
  checkForAliensCleared();
  updateMotherShipExpl();
  if (motherShip.isInitialized && motherShip.status > 0) {
    updateMotherShip();
  }
}

//drawGame functions
function drawLasers() {
  //player lasers
  for (let i = 0; i < lasers.length; i++) {
    ctx.beginPath();
    ctx.rect(lasers[i].x, lasers[i].y, lasers[i].w, lasers[i].h);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.closePath();
  }
  //alien lasers
  for (let i = 0; i < alienLasers.length; i++) {
    ctx.beginPath();
    ctx.rect(alienLasers[i].x, alienLasers[i].y, alienLasers[i].w, alienLasers[i].h);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
  }
}

function drawPlayerShip(frame, canvasX, canvasY) {
  //used in draw aliens
  ctx.drawImage(playerShip, frame * w, 0, w, h, canvasX, canvasY, 64, 64);
}

function drawAlien(frame, canvasX, canvasY) {
  //used in draw aliens
  ctx.drawImage(alienImage, frame * w, 0, w, h, canvasX, canvasY, w, h);
}

function drawMotherShip(frame, canvasX) {
  ctx.drawImage(alienShip, frame * w, 0, w, h, canvasX, 0, 64, 64);
}

function drawMotherShipExplosion(frame, canvasX, canvasY) {
  if (motherShip.explInitialized && !motherShip.explComplete) {
    ctx.drawImage(alienShip, frame * w, 0, w, h, canvasX, canvasY, 64, 64);
  }
}

function drawRedAlien(frame, canvasX, canvasY) {
  //used in draw aliens
  ctx.drawImage(alienRedImage, frame * w, 0, w, h, canvasX, canvasY, w, h);
}

function drawExplosion(frame, canvasX, canvasY) {
  //used in draw aliens
  ctx.drawImage(alienRedImage, frame * w, 32, w, h, canvasX, canvasY, w, h);
}

function drawAliens() {
  //for 1D array version
  for (let i = 0; i < aliens.length; i++) {
    if (aliens[i].status === 2) {
      drawAlien(frame, aliens[i].x, aliens[i].y);
    } else if (aliens[i].status === 1) {
      drawRedAlien(frame, aliens[i].x, aliens[i].y);
    } else if (aliens[i].status === 0) {
      drawExplosion(explFrame, aliens[i].x, aliens[i].y);
      //hacky solution - counts down from 20 giving it 2 frames at current frame rate
      aliens[i].expl -= 1;
      if (aliens[i].expl < 0) {
        aliens.splice(i, 1);
      }
    }
  }
}

function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "yellow";
  ctx.fillText("Score: " + gst.score, 8, 20);
}

function drawLives() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "yellow";
  ctx.fillText("Lives: " + gst.lives, canvas.width - 65, 20);
}

function drawShield() {
  ctx.beginPath();
  ctx.rect(shield.x, shield.y, shield.w, shield.h);
  ctx.fillStyle = shield.color[shield.status-1];
  ctx.fill();
  ctx.closePath();
}

function drawBombs() {
  if (bombs.length > 0) {
    for (let i = 0; i < bombs.length; i++) {
      ctx.beginPath();
      ctx.arc(bombs[i].x, bombs[i].y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.closePath();
    }
  }
}

function drawGame() {
  ctx.drawImage(background, 0, 0);
  // drawShip();
  drawPlayerShip(playerShipFrame, ship.x, ship.y);
  drawLasers();
  drawAliens();
  drawBombs();
  drawScore();
  drawLives();
  drawMotherShipExplosion(alienMotherShipExplFrame, motherShip.x, 0);
  if (motherShip.isInitialized && motherShip.status > 0) {
    drawMotherShip(alienShipFrame, motherShip.x);
  }
  if (shield.status > 0) {
    drawShield();
  }
}

//gameLoop and timimg variables
let dt;
let lastTime;

function gameLoop() {
  let now = Date.now();
  dt = (now - lastTime);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGame();
  update(dt);

  lastTime = now;
  if (!gst.isGameOver) {
    requestAnimationFrame(gameLoop);
  }
}

//start screen functions
function drawScreenOnce() {
  let now = Date.now();
  dt = (now - lastTime);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGame();
  update(dt);
  lastTime = now;
}

function runGameLoop() {
  gameLoop();
}

function drawStartMessage() {
  ctx.font = "32px Arial";
  ctx.fillStyle = "blue";
  ctx.fillText("CLICK", 198, canvas.height / 2);
  ctx.font = "32px Arial";
  ctx.fillText("TO START", 170, canvas.height/2 + 34);
}

function startScreen() {
  canvas.addEventListener('click', runGameLoop, {once: true});
  drawGame();
  drawStartMessage();
}

window.addEventListener('load', function() {
  startScreen();
});
