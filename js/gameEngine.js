/**
 * gameEngine.js
 * Sky Fruit Catcher Game Logic
 *
 * Mechanics:
 * - Basket moves based on Pose (Left, Center, Right)
 * - Fruits (Apple, Banana) fall from the sky
 * - Items (Shield, Magnet, Time) provide temporary buffs
 * - Bombs cause Game Over (unless Shield is active)
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
    this.onTimeUpdate = null;
    this.onItemSpawn = null;
    this.onItemRemove = null;
    this.onBasketMove = null;
    this.onEffectChange = null; // New: Notify UI about active effects

    // Game State
    this.currentPose = "Center";
    this.items = [];
    this.itemCounter = 0;
    this.basketPosition = "Center";

    // Active Effects
    this.hasShield = false;
    this.magnetTimer = null;
    this.timeSlowTimer = null;
    this.isMagnetActive = false;
    this.isTimeSlowActive = false;

    // Settings
    this.spawnRate = 2000;
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

    // Reset Effects
    this.hasShield = false;
    this.disableMagnet();
    this.disableTimeSlow();
    this.notifyEffects();

    this.startTimer();
    this.startSpawning();
    this.startGameLoop();
  }

  stop(reason = "Unknown") {
    this.isGameActive = false;
    clearInterval(this.gameTimer);
    clearTimeout(this.spawnTimer);
    cancelAnimationFrame(this.gameLoopId);

    this.disableMagnet();
    this.disableTimeSlow();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level, reason);
    }
  }

  startTimer() {
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      if (this.onTimeUpdate) this.onTimeUpdate(this.timeLimit);

      if (this.timeLimit === 40 || this.timeLimit === 20) {
        this.level++;
        this.baseSpeed += 0.1;
        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
      }

      if (this.timeLimit <= 0) {
        this.stop("Timeout");
      }
    }, 1000);
  }

  startSpawning() {
    const spawn = () => {
      if (!this.isGameActive) return;

      this.spawnItem();

      let nextSpawnTime = 2000 - (this.level * 200);
      if (nextSpawnTime < 800) nextSpawnTime = 800;

      this.spawnTimer = setTimeout(spawn, nextSpawnTime);
    };
    spawn();
  }

  spawnItem() {
    const lanes = ["Left", "Center", "Right"];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    const rand = Math.random();
    let type = "Apple"; // 50%
    let points = 100;

    // Item Probabilities
    if (rand < 0.15) { type = "Bomb"; points = 0; } // 15%
    else if (rand < 0.25) { type = "Banana"; points = 200; } // 10%
    else if (rand < 0.30) { type = "Shield"; points = 0; } // 5%
    else if (rand < 0.35) { type = "Magnet"; points = 0; } // 5%
    else if (rand < 0.40) { type = "Time"; points = 0; } // 5%

    let speed = this.baseSpeed;
    if (type === "Banana") speed += 0.2;
    // If Time Slow is active, reduce initial speed (though physics update handles it too)

    const item = {
      id: `item_${this.itemCounter++}`,
      type: type,
      points: points,
      lane: lane,
      y: 0,
      originalSpeed: speed,
      speed: speed
    };

    this.items.push(item);
    if (this.onItemSpawn) this.onItemSpawn(item);
  }

  startGameLoop() {
    const loop = () => {
      if (!this.isGameActive) return;
      this.updatePhysics();
      this.gameLoopId = requestAnimationFrame(loop);
    };
    this.gameLoopId = requestAnimationFrame(loop);
  }

  updatePhysics() {
    this.items.forEach(item => {
      // Apply Time Slow Effect
      let currentSpeed = item.originalSpeed;
      if (this.isTimeSlowActive) currentSpeed *= 0.5;

      item.y += currentSpeed;

      // Magnet Pull Logic
      if (this.isMagnetActive && item.y > 50 && ["Apple", "Banana", "Shield", "Magnet", "Time"].includes(item.type)) {
        // Move item lane towards basketPosition
        // Simple visual logic: snap to basket lane if close enough in Y?
        // Or literally change the lane property so it renders in the new lane
        if (item.lane !== this.basketPosition) {
          item.lane = this.basketPosition;
        }
      }
    });

    this.items = this.items.filter(item => {
      if (item.y > 100) {
        if (this.onItemRemove) this.onItemRemove(item.id);
        return false;
      }

      // Collision Logic
      if (item.y > 80 && item.y < 95) {
        // Normal Catch
        let caught = (item.lane === this.basketPosition);

        // Magnet Catch (Only for positive items)
        if (this.isMagnetActive && ["Apple", "Banana", "Shield", "Magnet", "Time"].includes(item.type)) {
          // Visualize magnet pull? For now just catch if in range
          caught = true;
        }

        if (caught) {
          this.handleCatch(item);
          if (this.onItemRemove) this.onItemRemove(item.id);
          return false;
        }
      }

      return true;
    });

    if (this.onRender) this.onRender(this.items);
  }

  handleCatch(item) {
    switch (item.type) {
      case "Bomb":
        if (this.hasShield) {
          this.hasShield = false; // Consume shield
          this.notifyEffects();
          // Sound effect for shield break?
        } else {
          this.stop("Bomb"); // Game Over
        }
        break;
      case "Shield":
        this.hasShield = true;
        this.notifyEffects();
        break;
      case "Magnet":
        this.activateMagnet();
        break;
      case "Time":
        this.activateTimeSlow();
        break;
      case "Banana":
        this.addScore(200);
        break;
      case "Apple":
      default:
        this.addScore(100);
        break;
    }
  }

  // Effect Logic
  activateMagnet() {
    this.isMagnetActive = true;
    this.notifyEffects();
    if (this.magnetTimer) clearTimeout(this.magnetTimer);
    this.magnetTimer = setTimeout(() => {
      this.disableMagnet();
    }, 5000); // 5 seconds
  }

  disableMagnet() {
    this.isMagnetActive = false;
    this.notifyEffects();
    if (this.magnetTimer) clearTimeout(this.magnetTimer);
  }

  activateTimeSlow() {
    this.isTimeSlowActive = true;
    this.notifyEffects();
    if (this.timeSlowTimer) clearTimeout(this.timeSlowTimer);
    this.timeSlowTimer = setTimeout(() => {
      this.disableTimeSlow();
    }, 5000); // 5 seconds
  }

  disableTimeSlow() {
    this.isTimeSlowActive = false;
    this.notifyEffects();
    if (this.timeSlowTimer) clearTimeout(this.timeSlowTimer);
  }

  notifyEffects() {
    if (this.onEffectChange) {
      this.onEffectChange({
        shield: this.hasShield,
        magnet: this.isMagnetActive,
        timeSlow: this.isTimeSlowActive
      });
    }
  }

  onPoseDetected(detectedPose) {
    if (!this.isGameActive) return;
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

  // Setters
  setScoreChangeCallback(cb) { this.onScoreChange = cb; }
  setGameEndCallback(cb) { this.onGameEnd = cb; }
  setBasketMoveCallback(cb) { this.onBasketMove = cb; }
  setItemSpawnCallback(cb) { this.onItemSpawn = cb; }
  setItemRemoveCallback(cb) { this.onItemRemove = cb; }
  setRenderCallback(cb) { this.onRender = cb; }
  setTimeUpdateCallback(cb) { this.onTimeUpdate = cb; }
  setEffectChangeCallback(cb) { this.onEffectChange = cb; }

  getGameState() {
    return {
      isActive: this.isGameActive,
      score: this.score,
      level: this.level,
      basketPosition: this.basketPosition,
      effects: {
        shield: this.hasShield,
        magnet: this.isMagnetActive,
        timeSlow: this.isTimeSlowActive
      }
    };
  }
}

window.GameEngine = GameEngine;
