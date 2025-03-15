import "./style.css";
import Phaser from "phaser";

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "app",
  pixelArt: true, // Add pixelArt setting to prevent texture smoothing
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

// Initialize the game
new Phaser.Game(config);

// Game variables
let player: Phaser.Physics.Arcade.Sprite;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let map: number[][] = [];
let tileSize = 32; // Display size of tiles
let mapWidth = 25;
let mapHeight = 19;
let floorLayer: Phaser.GameObjects.Group;
let walls: Phaser.Physics.Arcade.StaticGroup;
let decorations: Phaser.GameObjects.Group;
let enemies: Phaser.Physics.Arcade.Group;
let playerHealthBar: Phaser.GameObjects.Graphics;
let playerHealth = 100;
let attackKey: Phaser.Input.Keyboard.Key;
let attackCooldown = false;
let playerAttackArea: Phaser.GameObjects.Rectangle;
let projectiles: Phaser.Physics.Arcade.Group; // Group for projectiles
let playerFacing = "down"; // Track player facing direction

// Tile indices in the spritesheet
const TILES = {
  // Floor tiles (row 1)
  FLOOR: {
    BASIC: 269,
    CRACKED: 257,
    DIRTY: 258,
  },
  // Wall tiles (row 2)
  WALL: {
    BASIC: 16,
    DAMAGED: 16,
    DECORATED: 16,
  },
  // Decorations (row 3-4)
  DECORATION: {
    TORCH: 192,
    BARREL: 193,
    CHEST: 194,
    BONES: 195,
    BLOOD: 196,
    SLIME: 197,
  },
};

// Enemy class
class Enemy extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  healthBar: Phaser.GameObjects.Graphics;
  lastMoveTime: number;
  moveInterval: number;
  scene: Phaser.Scene;
  damageCooldown: boolean; // Add damage cooldown flag

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number
  ) {
    super(scene, x, y, texture, frame);
    this.scene = scene;
    this.health = 100; // Increased from 50 to 100
    this.maxHealth = 100; // Increased from 50 to 100
    this.lastMoveTime = 0;
    this.moveInterval = 1000 + Math.random() * 1000; // Random interval between 1-2 seconds
    this.damageCooldown = false; // Initialize damage cooldown

    // Create health bar
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth
    this.setDepth(8);
  }

  updateHealthBar() {
    this.healthBar.clear();

    // Background of health bar (red)
    this.healthBar.fillStyle(0xff0000);
    this.healthBar.fillRect(this.x - 15, this.y - 20, 30, 5);

    // Health amount (green)
    this.healthBar.fillStyle(0x00ff00);
    const healthWidth = Math.max(0, (this.health / this.maxHealth) * 30);
    this.healthBar.fillRect(this.x - 15, this.y - 20, healthWidth, 5);
  }

  takeDamage(amount: number) {
    // Check if enemy is in damage cooldown
    if (this.damageCooldown) return;

    // Apply damage
    this.health -= amount;
    this.health = Math.max(0, this.health);
    this.updateHealthBar();

    // Set damage cooldown
    this.damageCooldown = true;
    this.scene.time.delayedCall(2000, () => {
      this.damageCooldown = false;
    });

    // Check if enemy is dead
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    // Remove health bar
    if (this.healthBar) {
      this.healthBar.destroy();
    }

    // Destroy the enemy
    this.destroy();
  }

  update(time: number) {
    this.updateHealthBar();

    // Move randomly at intervals
    if (time > this.lastMoveTime + this.moveInterval) {
      this.lastMoveTime = time;
      this.moveInterval = 1000 + Math.random() * 1000;

      // Choose random direction
      const direction = Math.floor(Math.random() * 4);
      const speed = 50;

      // Reset velocity
      this.setVelocity(0);

      switch (direction) {
        case 0: // Left
          this.setVelocityX(-speed);
          this.anims.play("crab_left", true);
          break;
        case 1: // Right
          this.setVelocityX(speed);
          this.anims.play("crab_right", true);
          break;
        case 2: // Up
          this.setVelocityY(-speed);
          this.anims.play("crab_up", true);
          break;
        case 3: // Down
          this.setVelocityY(speed);
          this.anims.play("crab_down", true);
          break;
      }
    }
  }
}

// Projectile class
class Projectile extends Phaser.Physics.Arcade.Sprite {
  direction: string;
  active: boolean;
  isDisappearing: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: string) {
    super(scene, x, y, "attack_projectile", 0);
    this.direction = direction;
    this.active = false;
    this.isDisappearing = false;

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth to be above floor but below player
    this.setDepth(5);

    // Set appropriate velocity based on direction
    const speed = 200;
    switch (direction) {
      case "left":
        this.setVelocityX(-speed);
        this.setAngle(180); // Rotate sprite to face left
        break;
      case "right":
        this.setVelocityX(speed);
        break;
      case "up":
        this.setVelocityY(-speed);
        this.setAngle(270); // Rotate sprite to face up
        break;
      case "down":
        this.setVelocityY(speed);
        this.setAngle(90); // Rotate sprite to face down
        break;
    }

    // Play the animation
    this.anims.play("projectile_launch");

    // Set active frames (frames 2-3)
    this.scene.time.delayedCall(200, () => {
      this.active = true;
    });

    // Set timeout for projectile to disappear if it doesn't hit anything
    this.scene.time.delayedCall(1000, () => {
      if (this.active && !this.isDisappearing) {
        this.startDisappearing();
      }
    });

    // Listen for animation complete events
    this.on("animationcomplete", this.handleAnimationComplete, this);
  }

  handleAnimationComplete(animation: Phaser.Animations.Animation) {
    if (animation.key === "projectile_disappear") {
      this.destroy();
    }
  }

  startDisappearing() {
    if (this.isDisappearing) return;

    this.isDisappearing = true;
    this.setVelocity(0, 0);
    this.anims
      .play("projectile_disappear", true)
      .once("animationcomplete", () => {
        this.active = false;
        this.destroy();
      });
  }

  hitTarget() {
    if (this.active && !this.isDisappearing) {
      this.startDisappearing();
    }
  }

  // Override the preUpdate method to ensure the projectile keeps moving
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    // Ensure velocity is maintained (in case it's reset elsewhere)
    if (this.active && this.body && !this.isDisappearing) {
      const speed = 200;
      switch (this.direction) {
        case "left":
          this.body.velocity.x = -speed;
          break;
        case "right":
          this.body.velocity.x = speed;
          break;
        case "up":
          this.body.velocity.y = -speed;
          break;
        case "down":
          this.body.velocity.y = speed;
          break;
      }
    }
  }
}

// Preload assets
function preload(this: Phaser.Scene) {
  // Load character sprite sheet
  this.load.spritesheet("character", "assets/characters/character_1.png", {
    frameWidth: 32,
    frameHeight: 32,
  });

  // Load tileset as a spritesheet with 16x16 tiles
  this.load.spritesheet("tileset", "assets/tilesets/tileset_1.png", {
    frameWidth: 16,
    frameHeight: 16,
  });

  // Load enemy crab sprite sheet
  this.load.spritesheet("enemy_crab", "assets/characters/enemy_crab.png", {
    frameWidth: 48,
    frameHeight: 32,
  });

  // Load attack projectile sprite sheet
  this.load.spritesheet(
    "attack_projectile",
    "assets/attack/player_attack_1.png",
    {
      frameWidth: 32,
      frameHeight: 32,
    }
  );
}

// Create game objects
function create(this: Phaser.Scene) {
  // Initialize cursor keys for movement
  if (!this.input || !this.input.keyboard) {
    return;
  }

  cursors = this.input.keyboard.createCursorKeys();
  attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  // Generate procedural map
  generateMap();

  // Create floor, wall, and decoration groups
  floorLayer = this.add.group();
  walls = this.physics.add.staticGroup();
  decorations = this.add.group();
  enemies = this.physics.add.group({ classType: Enemy });
  projectiles = this.physics.add.group({ classType: Projectile });

  // Render the map
  renderMap(this);

  // Create player using the first frame (0)
  player = this.physics.add.sprite(
    Math.floor(mapWidth / 2) * tileSize + tileSize / 2,
    Math.floor(mapHeight / 2) * tileSize + tileSize / 2,
    "character",
    0 // Use the first frame
  );

  // Scale the player to match the tile size
  player.setScale(2);

  // Adjust the player's physics body to match the scaled sprite
  if (player.body) {
    // Make the player's collision box smaller than the sprite
    player.body.setSize(tileSize * 0.7, tileSize * 0.7);
    // Center the collision box
    player.body.setOffset(tileSize * 0.3, tileSize * 0.3);
  }

  // Create animations for the player
  this.anims.create({
    key: "idle_down",
    frames: this.anims.generateFrameNumbers("character", { start: 0, end: 0 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "idle_left",
    frames: this.anims.generateFrameNumbers("character", { start: 4, end: 4 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "idle_right",
    frames: this.anims.generateFrameNumbers("character", { start: 8, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "idle_up",
    frames: this.anims.generateFrameNumbers("character", {
      start: 12,
      end: 12,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "walk_down",
    frames: this.anims.generateFrameNumbers("character", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "walk_left",
    frames: this.anims.generateFrameNumbers("character", { start: 4, end: 7 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "walk_right",
    frames: this.anims.generateFrameNumbers("character", { start: 8, end: 11 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "walk_up",
    frames: this.anims.generateFrameNumbers("character", {
      start: 12,
      end: 15,
    }),
    frameRate: 10,
    repeat: -1,
  });

  // Create animations for the crab enemy
  this.anims.create({
    key: "crab_idle",
    frames: this.anims.generateFrameNumbers("enemy_crab", { start: 0, end: 0 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "crab_down",
    frames: this.anims.generateFrameNumbers("enemy_crab", { start: 0, end: 2 }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "crab_left",
    frames: this.anims.generateFrameNumbers("enemy_crab", { start: 3, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "crab_right",
    frames: this.anims.generateFrameNumbers("enemy_crab", { start: 6, end: 8 }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "crab_up",
    frames: this.anims.generateFrameNumbers("enemy_crab", {
      start: 9,
      end: 11,
    }),
    frameRate: 8,
    repeat: -1,
  });

  // Create animations for the projectile
  this.anims.create({
    key: "projectile_launch",
    frames: this.anims.generateFrameNumbers("attack_projectile", {
      start: 0,
      end: 3,
    }),
    frameRate: 16,
    repeat: 0,
  });

  this.anims.create({
    key: "projectile_disappear",
    frames: this.anims.generateFrameNumbers("attack_projectile", {
      start: 4,
      end: 9,
    }),
    frameRate: 24,
    repeat: 0,
  });

  // Set player depth to be above floor and walls
  player.setDepth(10);

  // Enable physics on the player
  // Don't use world bounds, we'll handle this with walls
  player.setCollideWorldBounds(false);

  // Add collision between player and walls
  this.physics.add.collider(player, walls);

  // Add collision between enemies and walls
  this.physics.add.collider(enemies, walls);

  // Add collision between enemies and player
  this.physics.add.collider(
    player,
    enemies,
    handlePlayerEnemyCollision,
    undefined,
    this
  );

  // Add collision between enemies
  this.physics.add.collider(enemies, enemies);

  // Add collision between projectiles and walls
  this.physics.add.collider(
    projectiles,
    walls,
    handleProjectileWallCollision,
    undefined,
    this
  );

  // Add collision between projectiles and enemies
  this.physics.add.overlap(
    projectiles,
    enemies,
    handleProjectileEnemyCollision,
    undefined,
    this
  );

  // Create player attack area (invisible)
  playerAttackArea = this.add.rectangle(
    0,
    0,
    tileSize * 1.5,
    tileSize * 1.5,
    0xff0000,
    0
  );
  this.physics.add.existing(playerAttackArea, false);
  if (playerAttackArea.body) {
    (playerAttackArea.body as Phaser.Physics.Arcade.Body).setAllowGravity(
      false
    );
  }

  // Add overlap between attack area and enemies
  this.physics.add.overlap(
    playerAttackArea,
    enemies,
    handleAttackHit.bind(this),
    undefined,
    this
  );

  // Set camera to follow player
  // Set the camera bounds to match the actual map size
  const worldWidth = mapWidth * tileSize;
  const worldHeight = mapHeight * tileSize;
  this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  this.cameras.main.startFollow(player, true, 0.08, 0.08);

  // Create player health bar (fixed to camera)
  playerHealthBar = this.add.graphics();
  playerHealthBar.setScrollFactor(0);
  playerHealthBar.setDepth(100);
  updatePlayerHealthBar(this);

  // Spawn enemies randomly on floor tiles
  spawnEnemies(this);

  // Start with idle animation
  player.anims.play("idle_down");

  // Debug: Log map data to console
  console.log("Map generation complete");
}

// Update game state
function update(this: Phaser.Scene, time: number) {
  // Skip if player is destroyed
  if (!player || !player.active) return;

  // Reset player velocity
  player.setVelocity(0);

  // Handle player movement
  const speed = 160;
  let moving = false;

  if (cursors.left.isDown) {
    player.setVelocityX(-speed);
    player.anims.play("walk_left", true);
    moving = true;
    playerFacing = "left";
  } else if (cursors.right.isDown) {
    player.setVelocityX(speed);
    player.anims.play("walk_right", true);
    moving = true;
    playerFacing = "right";
  }

  if (cursors.up.isDown) {
    player.setVelocityY(-speed);
    if (!moving) {
      player.anims.play("walk_up", true);
    }
    moving = true;
    playerFacing = "up";
  } else if (cursors.down.isDown) {
    player.setVelocityY(speed);
    if (!moving) {
      player.anims.play("walk_down", true);
    }
    moving = true;
    playerFacing = "down";
  }

  // If not moving, play idle animation based on facing direction
  if (!moving) {
    player.anims.play(`idle_${playerFacing}`, true);
  }

  // Prevent player from going outside the map
  if (player.x < tileSize / 2) {
    player.x = tileSize / 2;
  } else if (player.x > mapWidth * tileSize - tileSize / 2) {
    player.x = mapWidth * tileSize - tileSize / 2;
  }
  if (player.y < tileSize / 2) {
    player.y = tileSize / 2;
  } else if (player.y > mapHeight * tileSize - tileSize / 2) {
    player.y = mapHeight * tileSize - tileSize / 2;
  }

  // Update attack area position based on player position and facing direction
  updateAttackAreaPosition(playerFacing);

  // Handle attack input
  if (attackKey.isDown && !attackCooldown) {
    attackCooldown = true;

    // Visual feedback for attack
    this.cameras.main.shake(100, 0.005);

    // Create a new projectile in the facing direction
    const offsetDistance = 20; // Distance from player center to spawn projectile
    let projectileX = player.x;
    let projectileY = player.y;

    // Adjust spawn position based on facing direction
    switch (playerFacing) {
      case "left":
        projectileX -= offsetDistance;
        break;
      case "right":
        projectileX += offsetDistance;
        break;
      case "up":
        projectileY -= offsetDistance;
        break;
      case "down":
        projectileY += offsetDistance;
        break;
    }

    // Create and add the projectile to the group
    const projectile = new Projectile(
      this,
      projectileX,
      projectileY,
      playerFacing
    );
    projectiles.add(projectile);

    // Reset cooldown after delay
    this.time.delayedCall(500, () => {
      attackCooldown = false;
    });
  }

  // Update all enemies
  enemies.getChildren().forEach((enemy) => {
    (enemy as Enemy).update(time);
  });
}

// Position the attack area based on player facing direction
function updateAttackAreaPosition(facing: string) {
  if (!playerAttackArea || !player) return;

  const offset = tileSize * 0.75;

  switch (facing) {
    case "left":
      playerAttackArea.setPosition(player.x - offset, player.y);
      break;
    case "right":
      playerAttackArea.setPosition(player.x + offset, player.y);
      break;
    case "up":
      playerAttackArea.setPosition(player.x, player.y - offset);
      break;
    case "down":
      playerAttackArea.setPosition(player.x, player.y + offset);
      break;
  }
}

// Handle attack hit on enemy
function handleAttackHit(this: Phaser.Scene, _: any, object2: any) {
  if (!attackCooldown) return;

  // Cast to Enemy type - make sure we're getting the actual game object
  let enemyObj: any = object2;
  if (object2 instanceof Phaser.Physics.Arcade.Body) {
    enemyObj = object2.gameObject;
  }

  const enemy = enemyObj as Enemy;

  // Apply damage to enemy
  if (!enemy) return;

  // Apply damage and check if it was actually taken (not in cooldown)
  const prevHealth = enemy.health;
  enemy.takeDamage(20); // Reduced damage from 25 to 20

  // Only apply knockback if damage was taken
  if (prevHealth > enemy.health) {
    // Calculate knockback direction based on player position
    const knockbackForce = 150;
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      enemy.x,
      enemy.y
    );

    if (enemy && enemy.active) {
      enemy.setVelocity(
        Math.cos(angle) * knockbackForce,
        Math.sin(angle) * knockbackForce
      );
    }

    // Briefly disable enemy movement decisions during knockback
    enemy.lastMoveTime = this.time.now + 500;

    // Visual feedback
    enemy.setTint(0xff0000);
    this.time.delayedCall(200, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });
  }
}

// Handle collision between player and enemy
function handlePlayerEnemyCollision(_: any, __: any) {
  // Only take damage if not in cooldown
  if (!attackCooldown) {
    playerHealth -= 5;
    playerHealth = Math.max(0, playerHealth);

    // Update health bar
    updatePlayerHealthBar(player.scene);

    // Visual feedback
    player.scene.cameras.main.shake(100, 0.01);

    // Check for game over
    if (playerHealth <= 0) {
      // Game over logic
      player.scene.add
        .text(400, 300, "GAME OVER", {
          fontSize: "64px",
          color: "#ff0000",
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      // Disable player
      player.disableBody(true, false);
      player.setTint(0xff0000);
    }

    // Brief invulnerability
    attackCooldown = true;
    player.scene.time.delayedCall(1000, () => {
      attackCooldown = false;
    });
  }
}

// Handle projectile hitting a wall
function handleProjectileWallCollision(projectile: any, _wall: any) {
  (projectile as Projectile).hitTarget();
}

// Handle projectile hitting an enemy
function handleProjectileEnemyCollision(projectile: any, enemyObj: any) {
  const proj = projectile as Projectile;

  // Only damage if projectile is active
  if (proj.active) {
    const enemy = enemyObj as Enemy;

    // Apply damage to enemy
    const prevHealth = enemy.health;
    enemy.takeDamage(20);

    // Only apply knockback if damage was taken
    if (prevHealth > enemy.health) {
      // Calculate knockback direction based on projectile direction
      const knockbackForce = 150;
      let knockbackX = 0;
      let knockbackY = 0;

      switch (proj.direction) {
        case "left":
          knockbackX = -knockbackForce;
          break;
        case "right":
          knockbackX = knockbackForce;
          break;
        case "up":
          knockbackY = -knockbackForce;
          break;
        case "down":
          knockbackY = knockbackForce;
          break;
      }

      if (enemy && enemy.active) {
        enemy.setVelocity(knockbackX, knockbackY);
      }

      // Briefly disable enemy movement decisions during knockback
      enemy.lastMoveTime = proj.scene.time.now + 500;

      // Visual feedback
      enemy.setTint(0xff0000);
      proj.scene.time.delayedCall(200, () => {
        if (enemy.active) {
          enemy.clearTint();
        }
      });
    }

    // Make projectile disappear
    proj.hitTarget();
  }
}

// Update player health bar
function updatePlayerHealthBar(scene: Phaser.Scene) {
  if (!playerHealthBar) return;

  playerHealthBar.clear();

  // Background
  playerHealthBar.fillStyle(0x000000, 0.5);
  playerHealthBar.fillRect(10, 10, 200, 20);

  // Border
  playerHealthBar.lineStyle(2, 0xffffff, 1);
  playerHealthBar.strokeRect(10, 10, 200, 20);

  // Health amount
  const healthWidth = (playerHealth / 100) * 200;
  playerHealthBar.fillStyle(0x00ff00);
  playerHealthBar.fillRect(10, 10, healthWidth, 20);

  // Make sure health bar is fixed to camera
  playerHealthBar.setScrollFactor(0);
  playerHealthBar.setDepth(100); // Ensure it's always on top

  // Health text
  if (!scene.children.getByName("healthText")) {
    scene.add
      .text(15, 12, `Health: ${playerHealth}/100`, {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(100)
      .setName("healthText");
  } else {
    const healthText = scene.children.getByName(
      "healthText"
    ) as Phaser.GameObjects.Text;
    healthText.setText(`Health: ${playerHealth}/100`);
    healthText.setScrollFactor(0);
    healthText.setDepth(100);
  }
}

// Spawn enemies on random floor tiles
function spawnEnemies(scene: Phaser.Scene) {
  const numEnemies = 5 + Math.floor(Math.random() * 5); // 5-10 enemies

  // Find all floor tiles
  const floorTiles = [];
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (map[y][x] === 0) {
        // Don't spawn too close to player start
        const centerX = Math.floor(mapWidth / 2);
        const centerY = Math.floor(mapHeight / 2);
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );

        if (distance > 5) {
          // At least 5 tiles away from center
          floorTiles.push({ x, y });
        }
      }
    }
  }

  // Shuffle floor tiles
  floorTiles.sort(() => Math.random() - 0.5);

  // Spawn enemies on random floor tiles
  for (let i = 0; i < Math.min(numEnemies, floorTiles.length); i++) {
    const tile = floorTiles[i];
    const enemy = new Enemy(
      scene,
      tile.x * tileSize + tileSize / 2,
      tile.y * tileSize + tileSize / 2,
      "enemy_crab",
      0
    );

    // Add to group
    enemies.add(enemy);

    // Start with idle animation
    enemy.anims.play("crab_idle");
  }
}

// Generate a procedural map using cellular automata
function generateMap() {
  // Initialize map with random walls
  map = Array(mapHeight)
    .fill(0)
    .map(() => Array(mapWidth).fill(0));

  // Fill map with random walls (1) and floors (0)
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      // Make edges walls
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        map[y][x] = 1; // Wall
      } else {
        // Random walls with 40% probability
        map[y][x] = Math.random() < 0.4 ? 1 : 0;
      }
    }
  }

  // Apply cellular automata to smooth the map
  for (let i = 0; i < 4; i++) {
    map = smoothMap(map);
  }

  // Ensure the center is always a floor for player spawn
  const centerX = Math.floor(mapWidth / 2);
  const centerY = Math.floor(mapHeight / 2);

  // Create a clear area in the center
  for (let y = centerY - 2; y <= centerY + 2; y++) {
    for (let x = centerX - 2; x <= centerX + 2; x++) {
      if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
        map[y][x] = 0; // Floor
      }
    }
  }
}

// Smooth the map using cellular automata rules
function smoothMap(oldMap: number[][]): number[][] {
  const newMap = Array(mapHeight)
    .fill(0)
    .map(() => Array(mapWidth).fill(0));

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      // Count walls in 3x3 neighborhood
      let wallCount = 0;

      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          const checkX = x + nx;
          const checkY = y + ny;

          // Check if out of bounds or is a wall
          if (
            checkX < 0 ||
            checkX >= mapWidth ||
            checkY < 0 ||
            checkY >= mapHeight ||
            oldMap[checkY][checkX] === 1
          ) {
            wallCount++;
          }
        }
      }

      // Apply cellular automata rules
      if (oldMap[y][x] === 1) {
        // If cell is a wall
        newMap[y][x] = wallCount >= 4 ? 1 : 0;
      } else {
        // If cell is a floor
        newMap[y][x] = wallCount >= 5 ? 1 : 0;
      }

      // Keep edges as walls
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        newMap[y][x] = 1;
      }
    }
  }

  return newMap;
}

// Render the map in the scene
function renderMap(scene: Phaser.Scene) {
  // Fill the entire map with black background first
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      // Add a black background tile everywhere
      const backgroundTile = scene.add.rectangle(
        tileX + tileSize / 2,
        tileY + tileSize / 2,
        tileSize,
        tileSize,
        0x000000
      );
      backgroundTile.setDepth(-1); // Set background to lowest depth
    }
  }

  // Then create all floor tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      // Only add floor tiles where the map indicates (not on walls)
      if (map[y][x] === 0) {
        // Select floor tile type based on position and randomness
        let floorFrame = TILES.FLOOR.BASIC;

        // Add variety to floor tiles
        const rand = Math.random();
        if (rand < 0.1) {
          floorFrame = TILES.FLOOR.CRACKED; // 10% chance of cracked floor
        } else if (rand < 0.2) {
          floorFrame = TILES.FLOOR.DIRTY; // 10% chance of dirty floor
        }

        const floorTile = scene.add.sprite(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "tileset",
          floorFrame
        );

        // Scale the 16x16 tiles to 32x32 to match the player size
        floorTile.setScale(2);
        floorTile.setDepth(0); // Set floor to lowest depth
        floorLayer.add(floorTile);
      }
    }
  }

  // Then add wall tiles on top
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      if (map[y][x] === 1) {
        // Select wall tile type based on position and randomness
        let wallFrame = TILES.WALL.BASIC;

        // Add variety to wall tiles
        const rand = Math.random();
        if (rand < 0.15) {
          wallFrame = TILES.WALL.DAMAGED; // 15% chance of damaged wall
        } else if (rand < 0.25) {
          wallFrame = TILES.WALL.DECORATED; // 10% chance of decorated wall
        }

        const wall = walls.create(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "tileset",
          wallFrame
        );

        // Scale the 16x16 tiles to 32x32 to match the player size
        wall.setScale(2);
        wall.setDepth(5); // Set walls to higher depth than floor
        wall.setImmovable(true);

        // Update the physics body size to match the scaled sprite
        if (wall.body) {
          wall.body.setSize(tileSize, tileSize);
        }
      }
    }
  }

  // Add decorations on floor tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      // Only add decorations on floor tiles (not walls)
      if (map[y][x] === 0) {
        const tileX = x * tileSize;
        const tileY = y * tileSize;

        // 8% chance to add a decoration on a floor tile
        if (Math.random() < 0.08) {
          // Choose a random decoration
          let decorFrame;
          const rand = Math.random();

          if (rand < 0.2) {
            decorFrame = TILES.DECORATION.TORCH; // 20% chance of torch
          } else if (rand < 0.4) {
            decorFrame = TILES.DECORATION.BARREL; // 20% chance of barrel
          } else if (rand < 0.5) {
            decorFrame = TILES.DECORATION.CHEST; // 10% chance of chest
          } else if (rand < 0.7) {
            decorFrame = TILES.DECORATION.BONES; // 20% chance of bones
          } else if (rand < 0.85) {
            decorFrame = TILES.DECORATION.BLOOD; // 15% chance of blood
          } else {
            decorFrame = TILES.DECORATION.SLIME; // 15% chance of slime
          }

          const decoration = scene.add.sprite(
            tileX + tileSize / 2,
            tileY + tileSize / 2,
            "tileset",
            decorFrame
          );

          // Scale the 16x16 tiles to 32x32 to match the player size
          decoration.setScale(2);
          decoration.setDepth(2); // Set decorations above floor but below walls
          decorations.add(decoration);
        }
      }
    }
  }
}
