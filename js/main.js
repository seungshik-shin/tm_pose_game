/**
 * main.js
 * Entry point for Sky Fruit Catcher
 */

let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

// DOM Elements
const gameArea = document.getElementById("game-area");
const basket = document.getElementById("basket");
const scoreBoard = document.getElementById("score-board");
const timerBoard = document.getElementById("timer-board");
const levelBoard = document.getElementById("level-board");
const gameStartBtn = document.getElementById("gameStartBtn");

/**
 * Initialize Camera & Pose Engine
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true;
  startBtn.innerText = "Loading...";

  try {
    // 1. PoseEngine
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200,
      flip: true
    });

    // 2. Stabilizer
    stabilizer = new PredictionStabilizer({
      threshold: 0.8, // Higher threshold for stability
      smoothingFrames: 5 // More frames for smoother control
    });

    // 3. GameEngine
    gameEngine = new GameEngine();
    setupGameCallbacks();

    // 4. Canvas
    const canvas = document.getElementById("canvas");
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext("2d");

    // 5. Labels
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. Start
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);
    poseEngine.start();

    startBtn.style.display = "none";
    gameStartBtn.disabled = false;
    document.getElementById("stopBtn").disabled = false;

  } catch (error) {
    console.error("Init failed:", error);
    alert("Camera initialization failed.");
    startBtn.disabled = false;
    startBtn.innerText = "Camera On";
  }
}

/**
 * Setup Game Callbacks
 */
function setupGameCallbacks() {
  // Score & Level
  gameEngine.setScoreChangeCallback((score, level) => {
    scoreBoard.innerText = `Score: ${score}`;
    levelBoard.innerText = `Level: ${level}`;
  });

  // Timer
  gameEngine.setTimeUpdateCallback((time) => {
    timerBoard.innerText = `Time: ${time}`;
    if (time <= 10) timerBoard.style.color = "red";
    else timerBoard.style.color = "white";
  });

  // Basket Movement
  gameEngine.setBasketMoveCallback((position) => {
    let left = "50%";
    if (position === "Left") left = "16%";
    else if (position === "Right") left = "84%";
    else left = "50%"; // Center

    basket.style.left = left;
  });

  // Item Spawn
  gameEngine.setItemSpawnCallback((item) => {
    const el = document.createElement("div");
    el.id = item.id;
    el.className = "item";

    // Content
    if (item.type === "Apple") el.innerText = "🍎";
    else if (item.type === "Banana") el.innerText = "🍌";
    else if (item.type === "Bomb") el.innerText = "💣";

    // X Position
    let left = "50%";
    if (item.lane === "Left") left = "16%";
    else if (item.lane === "Right") left = "84%";

    el.style.left = left;
    el.style.top = "0%";

    gameArea.appendChild(el);
  });

  // Item Remove
  gameEngine.setItemRemoveCallback((itemId) => {
    const el = document.getElementById(itemId);
    if (el) el.remove();
  });

  // Render Loop (Update Item Positions)
  gameEngine.setRenderCallback((items) => {
    items.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.style.top = `${item.y}%`;
      }
    });
  });

  // Game End
  gameEngine.setGameEndCallback((score, level) => {
    alert(`Game Over!\nScore: ${score}\nLevel: ${level}`);
    // Clear items
    const items = document.querySelectorAll(".item");
    items.forEach(el => el.remove());

    gameStartBtn.disabled = false;
    gameStartBtn.innerText = "Restart Game";
  });
}

function startGame() {
  gameStartBtn.disabled = true;
  gameEngine.start({ timeLimit: 60 });
}

function stop() {
  if (poseEngine) poseEngine.stop();
  if (gameEngine) gameEngine.stop();
  document.getElementById("startBtn").disabled = false;
  document.getElementById("startBtn").style.display = "inline-block";
  gameStartBtn.disabled = true;
}

/**
 * Prediction Handler
 */
function handlePrediction(predictions) {
  // 1. Stabilize
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Debug UI
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  const maxDiv = document.getElementById("max-prediction");
  maxDiv.innerText = stabilized.className || "-";

  // 3. Game Input
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * Draw Pose on Canvas
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0);
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}
