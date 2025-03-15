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

// Preload assets
function preload(this: Phaser.Scene) {
  // Load character sprite sheet
  this.load.spritesheet("character", "assets/characters/character_1.png", {
    frameWidth: 16,
    frameHeight: 22,
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

  // Load enemy bite animation
  this.load.spritesheet("enemy_bite_1", "assets/attack/enemy_bite_1.png", {
    frameWidth: 32,
    frameHeight: 32,
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
  // Initialize cursor keys for movement
  if (!this.input || !this.input.keyboard) {
    return;
  }

  cursors = this.input.keyboard.createCursorKeys();
  attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  attackKey2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C); // C key for attack 2
  attackKey3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // X key for shield

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
    frameRate: 8,
    repeat: -1, // Loop indefinitely
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
          enemy.anims.currentAnim.key === "enemy_bite") ||
        attackCooldown
      ) {
        return;
      }

      // Set attack cooldown
      attackCooldown = true;
      playerSprite.scene.time.delayedCall(1000, () => {
        attackCooldown = false;
      });

      // Play bite animation
      const biteAnim = enemy.scene.add.sprite(enemy.x, enemy.y, "enemy_bite_1");
      biteAnim.setScale(3);
      biteAnim.setDepth(15); // Above player and enemy
      biteAnim.anims.play("enemy_bite");

      // Position the bite animation between player and enemy
      const midX = (playerSprite.x + enemy.x) / 2;
      const midY = (playerSprite.y + enemy.y) / 2;
      biteAnim.setPosition(midX, midY);

      // Rotate the bite animation to face the player
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        playerSprite.x,
        playerSprite.y
      );
      biteAnim.setRotation(angle);

      // Damage the player
      playerTakeDamage(10);

      // Destroy the bite animation when it completes
      biteAnim.once("animationcomplete", () => {
        biteAnim.destroy();
      });

      // Apply knockback to the player
      const knockbackForce = 100;
      const knockbackX = Math.cos(angle) * knockbackForce;
      const knockbackY = Math.sin(angle) * knockbackForce;
      playerSprite.setVelocity(knockbackX, knockbackY);

      // Visual feedback - flash the player red
      playerSprite.setTint(0xff0000);
      playerSprite.scene.time.delayedCall(200, () => {
        playerSprite.clearTint();
      });
    },
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
  // Skip update if player is dead
  if (!player.active) return;

  // Update player movement
  updatePlayerMovement();

  // Update attack cooldown
  if (attackKey.isDown && !attackCooldown) {
    attackCooldown = true;
    fireProjectile(this);
    this.time.delayedCall(500, () => {
      attackCooldown = false;
    });
  }

  // Handle Attack 2 (C key)
  if (attackKey2.isDown && !attackCooldown) {
    attackCooldown = true;
    performAttack2(this);
    this.time.delayedCall(800, () => {
      attackCooldown = false;
    });
  }

  // Handle Shield (X key)
  if (attackKey3.isDown && !shieldActive && !attackCooldown) {
    activateShield(this);
  }

  // Update enemies
  enemies.getChildren().forEach((enemy: Phaser.GameObjects.GameObject) => {
    (enemy as Enemy).update(time);
  });

  // Update shield position
  updateShieldPosition();
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
  scene.physics.world.collide(tempBody, walls, () => {
    willHitWall = true;
  });

  // Destroy the temporary body
  tempBody.destroy();

  // If the attack would hit a wall, don't perform it
  if (willHitWall) {
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
  attackArea.setSize(64, 64); // Larger collision area

  // Check for enemies in range and damage them
  scene.physics.add.overlap(attackArea, enemies, (_attackObj, enemyObj) => {
    const enemy = enemyObj as Enemy;

    // Apply damage to enemy
    const damage = 30;
    const prevHealth = enemy.health;
    enemy.takeDamage(damage);

    // Only apply knockback if damage was taken
    if (prevHealth > enemy.health) {
      // Calculate knockback direction based on attack direction
      const knockbackForce = 100;
      let knockbackX = 0;
      let knockbackY = 0;

      switch (playerFacing) {
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

      // Apply knockback
      if (enemy.active) {
        enemy.setVelocity(knockbackX, knockbackY);
      }

      // Briefly disable enemy movement decisions during knockback
      enemy.lastMoveTime = scene.time.now + 300;

      // Visual feedback
      enemy.setTint(0xff0000);
      scene.time.delayedCall(200, () => {
        enemy.clearTint();
      });
    }
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
      .text(110, 20, `Health: ${playerHealth}/100`, {
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
    healthText.setPosition(110, 20);
    healthText.setScrollFactor(0);
    healthText.setDepth(100);
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
