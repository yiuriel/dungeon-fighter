import Phaser from "phaser";
import {
  generateMap,
  mapHeight,
  mapWidth,
  renderMap as renderMapFromGenerator,
  spawnEnemies as spawnEnemiesFromGenerator,
  tileSize,
  TILES,
} from "./map/mapGenerator";
import { Enemy } from "./spawners/Enemy";
import { Projectile } from "./spawners/Projectile";
import "./style.css";
import { findSafePlayerPosition } from "./map/findSafePlayerPosition";
import { NewLevelSign } from "./helpers/new.level.sign";
import { StartScreen } from "./helpers/start.screen";

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "app",
  pixelArt: true, // Add pixelArt setting to prevent texture smoothing
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // Enable debug rendering
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
let floorLayer: Phaser.GameObjects.Group;
let walls: Phaser.Physics.Arcade.StaticGroup;
let decorations: Phaser.GameObjects.Group;
let enemies: Phaser.Physics.Arcade.Group;
let playerHealthBar: Phaser.GameObjects.Graphics;
let playerHealth = 100;
let attackKey: Phaser.Input.Keyboard.Key;
let attackKey2: Phaser.Input.Keyboard.Key; // Key for attack 2
let attackKey3: Phaser.Input.Keyboard.Key; // Key for shield
let attackCooldown = false;
let shieldActive = false; // Track if shield is active
let shieldSprite: Phaser.GameObjects.Sprite; // Sprite for shield animation
let playerAttackArea: Phaser.GameObjects.Rectangle;
let projectiles: Phaser.Physics.Arcade.Group; // Group for projectiles
let playerFacing = "down"; // Track player facing direction
let currentLevel = 1; // Track current level
let nextLevelSign: Phaser.GameObjects.Text | null = null; // Next level sign
let nextLevelPortal: Phaser.GameObjects.Ellipse | null = null; // Portal visual
let levelSignManager: NewLevelSign | null = null; // Level sign manager
let startScreen: StartScreen | null = null;
let gameStarted = false;

// Cooldown tracking
let basicAttackCooldownEnd = 0;
let attack2CooldownEnd = 0;
let shieldCooldownEnd = 0;
let cooldownIcons: {
  basic?: Phaser.GameObjects.Container;
  attack2?: Phaser.GameObjects.Container;
  shield?: Phaser.GameObjects.Container;
} = {};

// Preload assets
function preload(this: Phaser.Scene) {
  // Load character sprite sheet
  this.load.spritesheet("character", "assets/characters/mage.png", {
    frameWidth: 16,
    frameHeight: 22,
  });

  // Load tileset as a spritesheet with 16x16 tiles
  this.load.spritesheet("tileset", "assets/tilesets/tileset_1.png", {
    frameWidth: 16,
    frameHeight: 16,
  });

  // Load the new dungeon floor tileset
  this.load.spritesheet("dungeon_floor", "assets/tilesets/dungeon_floors.png", {
    frameWidth: 16,
    frameHeight: 16,
  });

  // Load the new dungeon wall tileset
  this.load.spritesheet("dungeon_wall", "assets/tilesets/dungeon_walls.png", {
    frameWidth: 16,
    frameHeight: 16,
  });

  // Load enemy crab sprite sheet
  this.load.spritesheet("enemy_crab", "assets/characters/enemy_crab.png", {
    frameWidth: 48,
    frameHeight: 32,
  });

  // Load enemy octopus sprite sheet
  this.load.spritesheet(
    "enemy_octopus",
    "assets/characters/enemy_octopus.png",
    {
      frameWidth: 32,
      frameHeight: 24,
    }
  );

  // Load attack projectile sprite sheet
  this.load.spritesheet(
    "attack_projectile",
    "assets/attack/player_attack_1.png",
    {
      frameWidth: 32,
      frameHeight: 32,
    }
  );

  // Load enemy bite animation
  this.load.spritesheet("enemy_bite_1", "assets/attack/enemy_bite_1.png", {
    frameWidth: 32,
    frameHeight: 32,
  });

  // Load enemy swipe animation
  this.load.spritesheet("enemy_swipe", "assets/attack/enemy_swipe.png", {
    frameWidth: 64,
    frameHeight: 48,
  });

  // Load death animation
  this.load.spritesheet("death_1", "assets/death/death_1.png", {
    frameWidth: 48,
    frameHeight: 28,
  });

  // Load player attack 2 animation
  this.load.spritesheet(
    "player_attack_2",
    "assets/attack/player_attack_2.png",
    {
      frameWidth: 32,
      frameHeight: 32,
    }
  );

  // Load player shield animation
  this.load.spritesheet("player_shield", "assets/attack/player_attack_3.png", {
    frameWidth: 32,
    frameHeight: 32,
  });
}

// Create game objects
function create(this: Phaser.Scene) {
  // Create start screen
  startScreen = new StartScreen(this, () => {
    startGame(this);
  });

  // Initialize cursor keys for movement
  if (!this.input || !this.input.keyboard) {
    return;
  }

  cursors = this.input.keyboard.createCursorKeys();
  attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  attackKey2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C); // C key for attack 2
  attackKey3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // X key for shield

  // Create floor, wall, and decoration groups
  floorLayer = this.add.group();
  walls = this.physics.add.staticGroup();
  decorations = this.add.group();
  enemies = this.physics.add.group({ classType: Enemy });
  projectiles = this.physics.add.group({ classType: Projectile });

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

  // Create animations for the octopus enemy
  this.anims.create({
    key: "octopus_idle",
    frames: this.anims.generateFrameNumbers("enemy_octopus", {
      start: 0,
      end: 0,
    }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "octopus_down",
    frames: this.anims.generateFrameNumbers("enemy_octopus", {
      start: 0,
      end: 2,
    }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "octopus_left",
    frames: this.anims.generateFrameNumbers("enemy_octopus", {
      start: 3,
      end: 5,
    }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "octopus_right",
    frames: this.anims.generateFrameNumbers("enemy_octopus", {
      start: 6,
      end: 8,
    }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: "octopus_up",
    frames: this.anims.generateFrameNumbers("enemy_octopus", {
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
    key: "projectile_idle",
    frames: this.anims.generateFrameNumbers("attack_projectile", {
      start: 3,
      end: 4,
    }),
    frameRate: 16,
    repeat: -1,
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

  // Create enemy bite animation
  this.anims.create({
    key: "enemy_bite",
    frames: this.anims.generateFrameNumbers("enemy_bite_1", {
      start: 0,
      end: 16,
    }),
    frameRate: 24,
    repeat: 0,
  });

  // Create enemy swipe animation
  this.anims.create({
    key: "enemy_swipe",
    frames: this.anims.generateFrameNumbers("enemy_swipe", {
      start: 0,
      end: 4,
    }),
    frameRate: 12,
    repeat: 0,
  });

  // Create attack 2 animation
  this.anims.create({
    key: "attack2",
    frames: this.anims.generateFrameNumbers("player_attack_2", {
      start: 0,
      end: 16,
    }),
    frameRate: 24,
    repeat: 0,
  });

  // Create shield start animation
  this.anims.create({
    key: "shield_start",
    frames: this.anims.generateFrameNumbers("player_shield", {
      start: 0,
      end: 13,
    }),
    frameRate: 24,
    repeat: 0,
  });

  // Create shield idle animation
  this.anims.create({
    key: "shield_idle",
    frames: this.anims.generateFrameNumbers("player_shield", {
      start: 14,
      end: 15,
    }),
    frameRate: 10,
    repeat: -1,
  });

  // Create shield end animation
  this.anims.create({
    key: "shield_end",
    frames: this.anims.generateFrameNumbers("player_shield", {
      start: 16,
      end: 21,
    }),
    frameRate: 24,
    repeat: 0,
  });

  // Create death animation
  this.anims.create({
    key: "death_animation",
    frames: this.anims.generateFrameNumbers("death_1", {
      start: 0,
      end: 7,
    }),
    frameRate: 18,
    repeat: 0,
  });

  // Show the start screen
  startScreen.startGame();
}

// Function to start the game (can be called directly to bypass start screen)
function startGame(scene: Phaser.Scene) {
  // Mark game as started
  gameStarted = true;

  // Generate procedural map
  map = generateMap();

  // Render the map
  renderMapFromGenerator(scene, map, floorLayer, walls, decorations);

  // Find a safe position for the player
  const safePosition = findSafePlayerPosition(map);

  // Create player using the first frame (0)
  player = scene.physics.add.sprite(
    safePosition.x,
    safePosition.y,
    "character",
    0 // Use the first frame
  );

  // Scale the player to match the tile size
  player.setScale(2);

  // Adjust the player's physics body to make the hitbox smaller
  if (player.body) {
    // Make the player's collision box 16x16 (smaller than the sprite)
    player.body.setSize(14, 14);
    // Center the collision box (offset to center the 16x16 hitbox in the sprite)
    player.body.setOffset(2, 8);
  }

  // Set player depth to be above floor and walls
  player.setDepth(50);

  // Enable physics on the player
  // Don't use world bounds, we'll handle this with walls
  player.setCollideWorldBounds(false);

  // Add collision between player and walls
  scene.physics.add.collider(player, walls);

  // Add collision between enemies and walls
  scene.physics.add.collider(enemies, walls);

  // Add collision between enemies and player
  scene.physics.add.collider(
    player,
    enemies,
    (playerObj, enemyObj) => {
      // Cast to proper types
      const playerSprite = playerObj as Phaser.Physics.Arcade.Sprite;
      const enemy = enemyObj as Enemy;

      // If shield is active, don't take damage
      if (shieldActive) {
        // Just push the enemy back slightly
        const angle = Phaser.Math.Angle.Between(
          playerSprite.x,
          playerSprite.y,
          enemy.x,
          enemy.y
        );
        const pushForce = 150;
        const pushX = Math.cos(angle) * pushForce;
        const pushY = Math.sin(angle) * pushForce;
        enemy.setVelocity(pushX, pushY);

        // Visual feedback on the shield
        if (shieldSprite) {
          shieldSprite.setTint(0x00ffff);
          playerSprite.scene.time.delayedCall(100, () => {
            if (shieldSprite) shieldSprite.clearTint();
          });
        }
        return;
      }

      // Only proceed if the enemy isn't already biting and player isn't in cooldown
      if (
        (enemy.anims.currentAnim &&
          (enemy.anims.currentAnim.key === "enemy_bite" ||
            enemy.anims.currentAnim.key === "enemy_swipe")) ||
        attackCooldown
      ) {
        return;
      }

      // Set attack cooldown
      attackCooldown = true;
      playerSprite.scene.time.delayedCall(1000, () => {
        attackCooldown = false;
      });

      // Play swipe animation instead of bite
      const swipeAnim = enemy.scene.add.sprite(enemy.x, enemy.y, "enemy_swipe");
      swipeAnim.setScale(2); // Adjusted scale for the larger swipe animation
      swipeAnim.setDepth(15); // Above player and enemy
      swipeAnim.anims.play("enemy_swipe");

      // Position the swipe animation between player and enemy
      const midX = (playerSprite.x + enemy.x) / 2;
      const midY = (playerSprite.y + enemy.y) / 2;
      swipeAnim.setPosition(midX, midY);

      // Rotate the swipe animation to face the player
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        playerSprite.x,
        playerSprite.y
      );
      swipeAnim.setRotation(angle);

      // Damage the player
      playerTakeDamage(10);

      // Destroy the swipe animation when it completes
      swipeAnim.once("animationcomplete", () => {
        swipeAnim.destroy();
      });

      // Apply knockback to the player
      const knockbackForce = 100;
      const knockbackX = Math.cos(angle) * knockbackForce;
      const knockbackY = Math.sin(angle) * knockbackForce;
      playerSprite.setVelocity(knockbackX, knockbackY);

      // Visual feedback - flash the player red
      playerSprite.scene.tweens.add({
        targets: playerSprite,
        tint: 0xff0000,
        ease: "Linear",
        duration: 300,
        onComplete: () => {
          playerSprite.scene.tweens.add({
            targets: playerSprite,
            tint: 0xffffff,
            ease: "Linear",
            duration: 300,
          });
        },
      });
    },
    undefined,
    scene
  );

  // Add collision between enemies
  scene.physics.add.collider(enemies, enemies);

  // Add collision between projectiles and walls
  scene.physics.add.collider(
    projectiles,
    walls,
    handleProjectileWallCollision,
    undefined,
    scene
  );

  // Add collision between projectiles and enemies
  scene.physics.add.overlap(
    projectiles,
    enemies,
    handleProjectileEnemyCollision,
    undefined,
    scene
  );

  // Create player attack area (invisible)
  playerAttackArea = scene.add.rectangle(
    0,
    0,
    tileSize * 1.25,
    tileSize * 1.25,
    0xff0000,
    0
  );
  scene.physics.add.existing(playerAttackArea, false);
  if (playerAttackArea.body) {
    (playerAttackArea.body as Phaser.Physics.Arcade.Body).setAllowGravity(
      false
    );
  }

  // Add overlap between attack area and enemies
  scene.physics.add.overlap(
    playerAttackArea,
    enemies,
    handleAttackHit.bind(scene),
    undefined,
    scene
  );

  // Set camera to follow player
  // Set the camera bounds to match the actual map size
  const worldWidth = mapWidth * tileSize;
  const worldHeight = mapHeight * tileSize;
  scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  scene.cameras.main.startFollow(player, true, 0.08, 0.08);

  // Create player health bar (fixed to camera)
  playerHealthBar = scene.add.graphics();
  playerHealthBar.setScrollFactor(0);
  playerHealthBar.setDepth(100);
  updatePlayerHealthBar(scene);

  // Create cooldown indicators
  createCooldownIndicators(scene);

  // Spawn enemies
  spawnEnemiesFromGenerator(scene, map, enemies);

  // Start with idle animation
  player.anims.play("idle_down");

  // Debug: Log map data to console
  console.log("Map generation complete");
}

// Create cooldown indicators for player abilities
function createCooldownIndicators(scene: Phaser.Scene) {
  const iconSize = 40;
  const iconSpacing = 10;
  const startX = 15;
  const startY = 55;

  // Basic attack indicator (projectile)
  cooldownIcons.basic = createCooldownIcon(
    scene,
    startX,
    startY,
    iconSize,
    0x44aaff,
    "Z",
    "Projectile"
  );

  // Attack 2 indicator (melee slash)
  cooldownIcons.attack2 = createCooldownIcon(
    scene,
    startX + iconSize + iconSpacing,
    startY,
    iconSize,
    0xff7700,
    "C",
    "Slash"
  );

  // Shield indicator
  cooldownIcons.shield = createCooldownIcon(
    scene,
    startX + (iconSize + iconSpacing) * 2,
    startY,
    iconSize,
    0x44ff44,
    "X",
    "Shield"
  );
}

// Helper function to create a cooldown icon
function createCooldownIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  color: number,
  keyText: string,
  abilityName: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  container.setDepth(101);
  container.setScrollFactor(0);

  // Background
  const background = scene.add.rectangle(
    size / 2,
    size / 2,
    size,
    size,
    0x333333,
    0.7
  );
  background.setStrokeStyle(2, 0xffffff, 0.8);

  // Icon (colored circle)
  const icon = scene.add.circle(size / 2, size / 2, size / 2 - 4, color, 1);

  // Key binding text
  const keyLabel = scene.add
    .text(size / 2, size / 2 - 2, keyText, {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
    .setOrigin(0.5);

  // Ability name below
  const nameLabel = scene.add
    .text(size / 2, size + 2, abilityName, {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#ffffff",
    })
    .setOrigin(0.5, 0);

  // Cooldown overlay (initially invisible)
  const cooldownOverlay = scene.add.graphics();

  // Add all elements to the container
  container.add([background, icon, keyLabel, cooldownOverlay, nameLabel]);

  // Store the cooldown overlay and icon for later reference
  (container as any).cooldownOverlay = cooldownOverlay;
  (container as any).icon = icon;

  return container;
}

// Update cooldown indicators
function updateCooldownIndicators(time: number) {
  // Update basic attack cooldown
  updateCooldownIcon(
    cooldownIcons.basic,
    time,
    basicAttackCooldownEnd,
    500 // Duration matches the cooldown in the code
  );

  // Update attack 2 cooldown
  updateCooldownIcon(
    cooldownIcons.attack2,
    time,
    attack2CooldownEnd,
    800 // Duration matches the cooldown in the code
  );

  // Update shield cooldown
  if (shieldActive) {
    // If shield is active, show it as fully on cooldown
    updateCooldownIcon(
      cooldownIcons.shield,
      0, // Current time not needed for full overlay
      1, // End time not needed for full overlay
      1, // Duration not needed for full overlay
      true // Force full overlay
    );
  } else {
    // Normal cooldown visualization
    updateCooldownIcon(
      cooldownIcons.shield,
      time,
      shieldCooldownEnd,
      2000 // Shield cooldown duration
    );
  }
}

// Update a single cooldown icon
function updateCooldownIcon(
  container: Phaser.GameObjects.Container | undefined,
  currentTime: number,
  endTime: number,
  duration: number,
  forceFull: boolean = false
) {
  if (!container) return;

  const cooldownOverlay = (container as any)
    .cooldownOverlay as Phaser.GameObjects.Graphics;
  const icon = (container as any).icon as Phaser.GameObjects.Shape;

  // Clear previous overlay
  cooldownOverlay.clear();

  if (forceFull) {
    // Draw full overlay
    cooldownOverlay.fillStyle(0x000000, 0.7);
    cooldownOverlay.fillRect(0, 0, 40, 40);
    icon.setAlpha(0.5);
    return;
  }

  // Calculate remaining cooldown
  const remaining = endTime - currentTime;

  if (remaining <= 0) {
    // Ability is ready
    icon.setAlpha(1);

    // Add a subtle pulsing effect to show it's ready
    if (!icon.data || !icon.data.get("pulsing")) {
      const scene = container.scene;
      scene.tweens.add({
        targets: icon,
        alpha: { from: 1, to: 0.7 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
      if (!icon.data) icon.setDataEnabled();
      icon.data.set("pulsing", true);
    }
    return;
  }

  // Stop pulsing effect if it was active
  if (icon.data && icon.data.get("pulsing")) {
    container.scene.tweens.killTweensOf(icon);
    icon.setAlpha(0.5);
    icon.data.set("pulsing", false);
  }

  // Calculate the fill percentage
  const fillPercent = remaining / duration;

  // Draw the cooldown overlay (semi-circle pie chart style)
  cooldownOverlay.fillStyle(0x000000, 0.7);

  const centerX = 20; // Half of icon size
  const centerY = 20; // Half of icon size
  const radius = 20; // Size of icon

  // Draw cooldown as a pie chart
  cooldownOverlay.beginPath();
  cooldownOverlay.moveTo(centerX, centerY);

  // Calculate end angle based on remaining time
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + 2 * Math.PI * fillPercent;

  cooldownOverlay.arc(centerX, centerY, radius, startAngle, endAngle, false);
  cooldownOverlay.closePath();
  cooldownOverlay.fillPath();
}

// Update game state
function update(this: Phaser.Scene, time: number) {
  // Skip game logic if game hasn't started yet
  if (!gameStarted) return;

  // If player doesn't exist, return
  if (!player) return;

  // Reset velocity
  player.setVelocity(0);

  // Handle player movement
  updatePlayerMovement();

  // Update attack cooldown
  if (attackKey.isDown && !attackCooldown) {
    attackCooldown = true;
    fireProjectile(this);
    basicAttackCooldownEnd = time + 500;
    this.time.delayedCall(500, () => {
      attackCooldown = false;
    });
  }

  // Handle Attack 2 (C key)
  if (attackKey2.isDown && !attackCooldown) {
    attackCooldown = true;
    performAttack2(this);
    attack2CooldownEnd = time + 800;
    this.time.delayedCall(800, () => {
      attackCooldown = false;
    });
  }

  // Handle Shield (X key)
  if (attackKey3.isDown && !shieldActive && !attackCooldown) {
    activateShield(this);
    shieldCooldownEnd = time + 4000; // 2s active + 2s cooldown
  }

  // Update cooldown indicators with current time
  updateCooldownIndicators(time);

  // Update enemies
  enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
    (enemy as Enemy).update(time, player);
  });

  // Update shield position
  updateShieldPosition();

  // Check if all enemies are defeated
  const activeEnemies = enemies.getChildren().filter((enemy) => {
    return (enemy as Phaser.Physics.Arcade.Sprite).active;
  });

  // If next level sign is already showing, check if player is touching it
  if (nextLevelSign && levelSignManager) {
    if (levelSignManager.isPlayerTouchingPortal()) {
      // Go to next level

      // Increment level counter
      currentLevel++;

      // Clear existing objects
      if (levelSignManager) {
        levelSignManager.destroy();
        levelSignManager = null;
        nextLevelSign = null;
        nextLevelPortal = null;
      }

      // Destroy all existing enemies
      enemies.clear(true, true);

      // Destroy all projectiles
      projectiles.clear(true, true);

      // Generate a new map
      map = generateMap();

      // Clear and recreate walls
      walls.clear(true, true);
      floorLayer.clear(true, true);

      // Render the new map
      renderMapFromGenerator(this, map, floorLayer, walls, decorations);

      // Find a safe position for the player (not inside a wall)
      const safePosition = findSafePlayerPosition(map);
      player.setPosition(safePosition.x, safePosition.y);

      // Set up collisions again
      this.physics.add.collider(player, walls);
      this.physics.add.collider(enemies, walls);
      this.physics.add.collider(
        projectiles,
        walls,
        handleProjectileWallCollision,
        undefined,
        this
      );

      // Spawn more enemies based on the current level
      spawnEnemiesFromGenerator(this, map, enemies, currentLevel - 1);

      // Reset player health and give bonus
      playerHealth = Math.min(100, playerHealth + 20); // Heal player by 20, up to max 100
      updatePlayerHealthBar(this);

      // Show level notification
      const levelText = this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          `LEVEL ${currentLevel}`,
          {
            fontSize: "64px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6,
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100);

      // Fade out level notification
      this.tweens.add({
        targets: levelText,
        alpha: 0,
        duration: 3000,
        ease: "Power2",
        onComplete: () => {
          levelText.destroy();
        },
      });
    }

    return;
  }

  // If no active enemies and no next level sign, show next level sign
  if (activeEnemies.length === 0 && !nextLevelSign) {
    // Create a new level sign using our class
    levelSignManager = new NewLevelSign(this, player, currentLevel);
    const { sign, portal } = levelSignManager.create();
    nextLevelSign = sign;
    nextLevelPortal = portal;

    // Play a victory sound
    // this.sound.play('level-complete');
  }
}

// Handle player movement
function updatePlayerMovement() {
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
}

// Fire a projectile in the direction the player is facing
function fireProjectile(scene: Phaser.Scene) {
  // Visual feedback for attack
  scene.cameras.main.shake(100, 0.005);

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
    scene,
    projectileX,
    projectileY,
    playerFacing
  );
  projectiles.add(projectile);
}

// Perform the second attack (melee slash in front of player)
function performAttack2(scene: Phaser.Scene) {
  // Calculate the position where the attack would appear
  let attackX = player.x;
  let attackY = player.y;
  let angle = 0;

  // Position the attack 100 units in front of the player
  switch (playerFacing) {
    case "left":
      attackX -= 100;
      angle = 180;
      break;
    case "right":
      attackX += 100;
      angle = 0;
      break;
    case "up":
      attackY -= 100;
      angle = 270;
      break;
    case "down":
      attackY += 100;
      angle = 90;
      break;
  }

  // Create a temporary physics body to check for wall collisions
  const tempBody = scene.physics.add.sprite(
    attackX,
    attackY,
    "player_attack_2"
  );
  tempBody.setVisible(false);
  tempBody.setSize(32, 32);

  // Check if the attack would hit a wall
  let willHitWall = false;
  let destructibleWall: any = null;

  scene.physics.world.collide(tempBody, walls, (_tempBody, wallObj) => {
    willHitWall = true;

    // Try to access the wall's properties safely
    try {
      if ((wallObj as any).isDestructible) {
        destructibleWall = wallObj;
      }
    } catch (e) {
      // Ignore errors if properties don't exist
    }
  });

  // Destroy the temporary body
  tempBody.destroy();

  // If the attack would hit a wall but it's destructible, allow the attack
  if (willHitWall && !destructibleWall) {
    // Visual feedback that attack can't be performed
    player.setTint(0xaaaaaa);
    scene.time.delayedCall(100, () => {
      player.clearTint();
    });
    return;
  }

  // Create the attack animation sprite
  const attackAnim = scene.add.sprite(attackX, attackY, "player_attack_2");
  attackAnim.setDepth(15);
  attackAnim.setAngle(angle);
  attackAnim.anims.play("attack2");

  // Create a physics body for the attack to detect collisions
  const attackArea = scene.physics.add.sprite(
    attackX,
    attackY,
    "player_attack_2"
  );
  attackArea.setVisible(false); // Hide the actual physics sprite
  attackArea.setSize(24, 24); // Set hitbox to 16x16
  attackArea.setOffset(4, 4); // Center the hitbox (assuming 32x32 sprite)

  // If we found a destructible wall, destroy it
  if (destructibleWall) {
    // Create a destruction effect at the wall's position
    const deathAnim = scene.add.sprite(
      destructibleWall.x,
      destructibleWall.y,
      "death_1"
    );
    deathAnim.setScale(1.5);
    deathAnim.setDepth(3);
    deathAnim.play("death_animation").once("animationcomplete", () => {
      deathAnim.destroy();
    });

    // Add a floor tile where the wall was
    const floorTileTypes = Object.values(TILES.FLOOR);
    const tileIndex =
      floorTileTypes[Math.floor(Math.random() * floorTileTypes.length)];
    const floorTile = scene.add.sprite(
      destructibleWall.x,
      destructibleWall.y,
      "dungeon_floor",
      tileIndex as number
    );
    floorTile.setScale(2);
    floorTile.setDepth(0); // Below walls and player
    floorLayer.add(floorTile);

    // Remove the wall after a short delay
    const wallToDestroy = destructibleWall;
    scene.time.delayedCall(200, () => {
      if (wallToDestroy && typeof wallToDestroy.destroy === "function") {
        wallToDestroy.destroy();
      }
    });
  }

  // Check for enemies in range and damage them
  scene.physics.add.overlap(attackArea, enemies, (_attackObj, enemyObj) => {
    const enemy = enemyObj as Enemy;

    // Apply damage to enemy
    const damage = 30;
    enemy.takeDamage(damage, player);
  });

  // Clean up the attack area after animation completes
  attackAnim.once("animationcomplete", () => {
    attackAnim.destroy();
    attackArea.destroy();
  });
}

// Activate the shield
function activateShield(scene: Phaser.Scene) {
  // Set shield as active
  shieldActive = true;

  // Create shield sprite around player
  shieldSprite = scene.add.sprite(player.x, player.y, "player_shield");
  shieldSprite.setDepth(12); // Above player but below UI
  shieldSprite.setScale(1.5);

  // Play start animation
  shieldSprite.anims.play("shield_start");

  // When start animation completes, switch to idle
  shieldSprite.once("animationcomplete", () => {
    shieldSprite.anims.play("shield_idle");

    // Set a timer to end the shield after 2 seconds
    scene.time.delayedCall(2000, () => {
      // Play end animation
      shieldSprite.anims.play("shield_end");

      // When end animation completes, destroy the shield
      shieldSprite.once("animationcomplete", () => {
        shieldSprite.destroy();
        shieldActive = false;

        // Set cooldown for 2 more seconds after shield ends
        attackCooldown = true;
        scene.time.delayedCall(2000, () => {
          attackCooldown = false;
        });
      });
    });
  });
}

// Update the shield position to follow the player
function updateShieldPosition() {
  if (shieldActive && shieldSprite) {
    shieldSprite.x = player.x;
    shieldSprite.y = player.y;
  }
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
  enemy.takeDamage(20, player); // Reduced damage from 25 to 20
}

// Handle projectile hitting a wall
function handleProjectileWallCollision(projectile: any, wallObj: any) {
  try {
    // Try to access the wall object safely
    const wall = wallObj.gameObject || wallObj;

    // Check if the wall is destructible
    if (wall && wall.isDestructible) {
      // Create a destruction effect at the wall's position
      const scene = projectile.scene;

      // Play death animation at wall position
      const deathAnim = scene.add.sprite(wall.x, wall.y, "death_1");
      deathAnim.setScale(1.5);
      deathAnim.setDepth(3);
      deathAnim.play("death_animation").once("animationcomplete", () => {
        deathAnim.destroy();
      });

      // Add a floor tile where the wall was
      const floorTileTypes = Object.values(TILES.FLOOR);
      const tileIndex =
        floorTileTypes[Math.floor(Math.random() * floorTileTypes.length)];
      const floorTile = scene.add.sprite(
        wall.x,
        wall.y,
        "dungeon_floor",
        tileIndex as number
      );
      floorTile.setScale(2);
      floorTile.setDepth(0); // Below walls and player
      floorLayer.add(floorTile);

      // Remove the wall after a short delay
      scene.time.delayedCall(200, () => {
        if (wall && wall.destroy) {
          wall.destroy();
        }
      });
    }
  } catch (e) {
    // Ignore errors if properties don't exist
  }

  // Handle the projectile hit
  (projectile as Projectile).hitTarget();
}

// Handle projectile hitting an enemy
function handleProjectileEnemyCollision(projectile: any, enemyObj: any) {
  const proj = projectile as Projectile;

  // Only damage if projectile is active
  if (proj.active) {
    const enemy = enemyObj as Enemy;

    // Apply damage to enemy
    enemy.takeDamage(20, player);

    // Make projectile disappear
    proj.hitTarget();
  }
}

// Update player health bar
function updatePlayerHealthBar(scene: Phaser.Scene) {
  if (!playerHealthBar) return;

  playerHealthBar.clear();

  const barWidth = 200;
  const barHeight = 24;
  const borderRadius = 8;
  const borderWidth = 2;
  const padding = 2;
  const x = 15;
  const y = 15;

  // Draw shadow
  playerHealthBar.fillStyle(0x000000, 0.3);
  playerHealthBar.fillRoundedRect(
    x + 2,
    y + 2,
    barWidth,
    barHeight,
    borderRadius
  );

  // Background (dark gray with transparency)
  playerHealthBar.fillStyle(0x333333, 0.7);
  playerHealthBar.fillRoundedRect(x, y, barWidth, barHeight, borderRadius);

  // Border
  playerHealthBar.lineStyle(borderWidth, 0xffffff, 0.8);
  playerHealthBar.strokeRoundedRect(x, y, barWidth, barHeight, borderRadius);

  // Health amount (gradient from green to yellow to red based on health)
  const healthPercent = playerHealth / 100;
  const healthWidth = Math.max(0, healthPercent * (barWidth - padding * 2));

  // Choose color based on health percentage
  let fillColor;
  if (healthPercent > 0.6) {
    fillColor = 0x44ff44; // Green for high health
  } else if (healthPercent > 0.3) {
    fillColor = 0xffff00; // Yellow for medium health
  } else {
    fillColor = 0xff4444; // Red for low health
  }

  // Inner health bar with smaller radius
  if (healthWidth > 0) {
    playerHealthBar.fillStyle(fillColor, 1);
    playerHealthBar.fillRoundedRect(
      x + padding,
      y + padding,
      healthWidth,
      barHeight - padding * 2,
      borderRadius - 2
    );
  }

  // Make sure health bar is fixed to camera
  playerHealthBar.setScrollFactor(0);
  playerHealthBar.setDepth(100); // Ensure it's always on top

  // Health text
  if (!scene.children.getByName("healthText")) {
    scene.add
      .text(x + barWidth / 2, y + barHeight / 2, `${playerHealth}/100`, {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setName("healthText");
  } else {
    const healthText = scene.children.getByName(
      "healthText"
    ) as Phaser.GameObjects.Text;
    healthText.setText(`${playerHealth}/100`);
    healthText.setPosition(x + barWidth / 2, y + barHeight / 2);
  }
}

function playerTakeDamage(damage: number) {
  playerHealth -= damage;
  playerHealth = Math.max(0, playerHealth);

  // Update health bar
  updatePlayerHealthBar(player.scene);

  // Visual feedback
  player.scene.cameras.main.shake(150, 0.05);

  // Check for game over
  if (playerHealth <= 0) {
    triggerGameOver(player.scene);
  }
}

// Handle game over state
function triggerGameOver(scene: Phaser.Scene) {
  // Display game over text
  scene.add
    .text(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2,
      "GAME OVER",
      {
        fontSize: "80px",
        color: "#ff0000",
      }
    )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(100);

  // Disable player
  player.disableBody(true, false);
  player.setTint(0xff0000);

  // Stop all enemies
  enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
    const enemySprite = enemy as Enemy;
    enemySprite.disableBody(true, false);
    enemySprite.setTint(0x555555); // Gray out enemies

    // Stop any ongoing animations
    if (enemySprite.anims.isPlaying) {
      enemySprite.anims.stop();
    }
  });

  // Stop any projectiles
  projectiles.getChildren().forEach((proj: Phaser.GameObjects.GameObject) => {
    const projectile = proj as Projectile;
    projectile.disableBody(true, false);
    projectile.setActive(false);
    projectile.setVisible(false);
  });

  // Add a restart button
  const restartButton = scene.add
    .text(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2 + 100,
      "RESTART",
      {
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#222222",
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      }
    )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(100)
    .setInteractive({ useHandCursor: true });

  // Add hover effect
  restartButton.on("pointerover", () => {
    restartButton.setStyle({ color: "#ffff00" });
  });

  restartButton.on("pointerout", () => {
    restartButton.setStyle({ color: "#ffffff" });
  });

  // Add click handler to restart the game
  restartButton.on("pointerdown", () => {
    scene.scene.restart();
    playerHealth = 100;
  });
}
