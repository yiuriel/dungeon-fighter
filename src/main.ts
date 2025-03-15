import "./style.css";
import Phaser from "phaser";
import {
  generateMap,
  renderMap as renderMapFromGenerator,
  spawnEnemies as spawnEnemiesFromGenerator,
  tileSize,
  mapWidth,
  mapHeight,
} from "./mapGenerator";
import { Projectile } from "./spawners/Projectile";
import { Enemy } from "./spawners/Enemy";

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
      debug: true, // Enable debug rendering
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
let attackCooldown = false;
let playerAttackArea: Phaser.GameObjects.Rectangle;
let projectiles: Phaser.Physics.Arcade.Group; // Group for projectiles
let playerFacing = "down"; // Track player facing direction

// Preload assets
function preload(this: Phaser.Scene) {
  // Load character sprite sheet
  this.load.spritesheet("character", "assets/characters/character_1.png", {
    frameWidth: 16,
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
  map = generateMap();

  // Create floor, wall, and decoration groups
  floorLayer = this.add.group();
  walls = this.physics.add.staticGroup();
  decorations = this.add.group();
  enemies = this.physics.add.group({ classType: Enemy });
  projectiles = this.physics.add.group({ classType: Projectile });

  // Render the map
  renderMapFromGenerator(this, map, floorLayer, walls, decorations);

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
  // if (player.body) {
  //   // Make the player's collision box smaller than the sprite
  //   // player.body.setSize(tileSize * 0.5, tileSize * 0.5);
  //   // Center the collision box
  //   // player.body.setOffset(tileSize, tileSize);
  // }

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
    tileSize * 1.25,
    tileSize * 1.25,
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

  // Spawn enemies
  spawnEnemiesFromGenerator(map, enemies);

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
      const knockbackForce = 100;
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
      enemy.lastMoveTime = proj.scene.time.now + 300;

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
      .setOrigin(0.5)
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
