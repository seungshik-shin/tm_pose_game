/**
 * gameEngine.js
 * Sky Fruit Catcher Game Logic
 *
 * Mechanics:
 * - Basket moves based on Pose (Left, Center, Right)
 * - Fruits (Apple, Banana) and Bombs fall from the sky
 * - Catch Fruit -> Score Up
 * - Catch Bomb -> Game Over
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 0;
    this.isGameActive = false;
    this.gameTimer = null;
    this.spawnTimer = null;
    this.gameLoopId = null;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;
    this.onTimeUpdate = null; // New: Update timer UI
    this.onItemSpawn = null;  // New: Render item
    this.onItemRemove = null; // New: Remove item
    this.onBasketMove = null; // New: Move basket UI

    // Game State
    this.currentPose = "Center"; // Default pose
    this.items = []; // Current falling items: { id, type, x, y, speed }
    this.itemCounter = 0;
    this.basketPosition = "Center"; // Left, Center, Right

    // Settings
    this.spawnRate = 2000; // ms (Slower start)
    this.baseSpeed = 0.5;
  }

  start(config = {}) {
    if (this.isGameActive) return;

    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = config.timeLimit || 60;
    this.items = [];
    this.currentPose = "Center";
    this.basketPosition = "Center";
    this.baseSpeed = 0.3;

    this.startTimer();
    this.startSpawning();
    this.startGameLoop();
  }

  stop() {
    this.isGameActive = false;
    clearInterval(this.gameTimer);
    clearTimeout(this.spawnTimer);
    cancelAnimationFrame(this.gameLoopId);

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  startTimer() {
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      if (this.onTimeUpdate) this.onTimeUpdate(this.timeLimit);

      // Level Up every 20 seconds
      if (this.timeLimit === 40 || this.timeLimit === 20) {
        this.level++;
        this.baseSpeed += 0.1; // Increase speed
        if (this.onScoreChange) this.onScoreChange(this.score, this.level); // Update UI
      }

      if (this.timeLimit <= 0) {
        this.stop();
      }
    }, 1000);
  }

  startSpawning() {
    const spawn = () => {
      if (!this.isGameActive) return;

      this.spawnItem();

      // Adjust spawn rate based on level
      // Level 1: 2000ms
      // Level 2: 1800ms
      // Level 3: 1600ms
      let nextSpawnTime = 2000 - (this.level * 200);
      if (nextSpawnTime < 800) nextSpawnTime = 800; // Min spawn time

      this.spawnTimer = setTimeout(spawn, nextSpawnTime);
    };
    spawn();
  }

  spawnItem() {
    const lanes = ["Left", "Center", "Right"];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Item Type Probabilities
    // Level 1: 10% Bomb
    // Level 2: 20% Bomb
    // Level 3: 30% Bomb
    const bombChance = 0.1 * this.level;
    const rand = Math.random();

    let type = "Apple";
    let points = 100;

    if (rand < bombChance) {
      type = "Bomb";
      points = 0;
    } else if (rand < bombChance + 0.3) { // 30% chance for Banana after bomb check
      type = "Banana";
      points = 200;
    }

    const item = {
      id: `item_${this.itemCounter++}`,
      type: type,
      points: points,
      lane: lane,
      y: 0, // Top of screen (0%)
      speed: this.baseSpeed + (type === "Banana" ? 0.2 : 0) // Bananas are faster
    };

    this.items.push(item);
    if (this.onItemSpawn) this.onItemSpawn(item);
  }

  /**
   * Main Game Loop (Physics & Collision)
   */
  startGameLoop() {
    const loop = () => {
      if (!this.isGameActive) return;

      this.updatePhysics();
      this.gameLoopId = requestAnimationFrame(loop);
    };
    this.gameLoopId = requestAnimationFrame(loop);
  }

  updatePhysics() {
    // Move Items
    this.items.forEach(item => {
      item.y += item.speed;
      if (this.onItemSpawn) {
        // We re-use onItemSpawn or create a new onItemUpdate to move visual elements
        // For simplicity, let's assume the main.js will handle the visual update loop 
        // OR we send position updates.
      }
    });

    // Check Collisions
    // Basket is at the bottom, let's say y > 85% to 95%
    // We catch if item.y represents bottom of item exceeding basket top

    // Filter out items needed to be removed
    this.items = this.items.filter(item => {
      // 1. Off-screen (Missed)
      if (item.y > 100) {
        if (this.onItemRemove) this.onItemRemove(item.id);
        return false;
      }

      // 2. Caught
      // Hitbox: y > 80 (basket high) AND lane matches
      if (item.y > 80 && item.y < 95 && item.lane === this.basketPosition) {
        this.handleCatch(item);
        if (this.onItemRemove) this.onItemRemove(item.id);
        return false; // Remove from array
      }

      return true;
    });

    // Request UI update for positions
    if (this.onRender) this.onRender(this.items);
  }

  handleCatch(item) {
    if (item.type === "Bomb") {
      // Game Over
      this.stop();
    } else {
      this.addScore(item.points);
      // Effect?
    }
  }

  /**
   * Pose Input Handler
   * @param {string} detectedPose 
   */
  onPoseDetected(detectedPose) {
    if (!this.isGameActive) return;

    // Update Basket Position
    if (["Left", "Center", "Right"].includes(detectedPose)) {
      this.basketPosition = detectedPose;
      if (this.onBasketMove) this.onBasketMove(this.basketPosition);
    }
  }

  addScore(points) {
    this.score += points;
    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  // Setters for Callbacks
  setScoreChangeCallback(params) { this.onScoreChange = params; }
  setGameEndCallback(params) { this.onGameEnd = params; }
  setBasketMoveCallback(params) { this.onBasketMove = params; }
  setItemSpawnCallback(params) { this.onItemSpawn = params; }
  setItemRemoveCallback(params) { this.onItemRemove = params; }
  setRenderCallback(params) { this.onRender = params; } // Update item positions
  setTimeUpdateCallback(params) { this.onTimeUpdate = params; }

  getGameState() {
    return {
      isActive: this.isGameActive,
      score: this.score,
      level: this.level,
      basketPosition: this.basketPosition
    };
  }
}

window.GameEngine = GameEngine;
