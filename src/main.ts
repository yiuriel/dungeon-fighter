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

class GameScene extends Phaser.Scene {
  constructor() {
    super();
  }

  // Game variables
  player!: Phaser.Physics.Arcade.Sprite;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  map: number[][] = [];
  floorLayer!: Phaser.GameObjects.Group;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  decorations!: Phaser.GameObjects.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  playerHealthBar!: Phaser.GameObjects.Graphics;
  playerHealth = 100;
  attackKey!: Phaser.Input.Keyboard.Key;
  attackKey2!: Phaser.Input.Keyboard.Key; // Key for attack 2
  attackKey3!: Phaser.Input.Keyboard.Key; // Key for shield
  attackCooldown = false;
  shieldActive = false; // Track if shield is active
  shieldSprite!: Phaser.GameObjects.Sprite; // Sprite for shield animation
  playerAttackArea!: Phaser.GameObjects.Rectangle;
  projectiles!: Phaser.Physics.Arcade.Group; // Group for projectiles
  playerFacing = "down"; // Track player facing direction
  currentLevel = 1; // Track current level
  nextLevelSign: Phaser.GameObjects.Text | null = null; // Next level sign
  nextLevelPortal: Phaser.GameObjects.Ellipse | null = null; // Portal visual
  levelSignManager: NewLevelSign | null = null; // Level sign manager
  startScreen: StartScreen | null = null;
  gameStarted = false;

  // Cooldown tracking
  basicAttackCooldownEnd = 0;
  attack2CooldownEnd = 0;
  shieldCooldownEnd = 0;
  cooldownIcons: {
    basic?: Phaser.GameObjects.Container;
    attack2?: Phaser.GameObjects.Container;
    shield?: Phaser.GameObjects.Container;
  } = {};

  // Preload assets
  preload() {
    console.log("Preloading assets", this);

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
    this.load.spritesheet(
      "dungeon_floor",
      "assets/tilesets/dungeon_floors.png",
      {
        frameWidth: 16,
        frameHeight: 16,
      }
    );

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
    this.load.spritesheet(
      "player_shield",
      "assets/attack/player_attack_3.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
  }

  // Create game objects
  create() {
    // Create start screen
    this.startScreen = new StartScreen(this, this.startGame.bind(this));

    // Initialize cursor keys for movement
    if (!this.input || !this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.attackKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.Z
    );
    this.attackKey2 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.C
    ); // C key for attack 2
    this.attackKey3 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.X
    ); // X key for shield

    // Create floor, wall, and decoration groups
    this.floorLayer = this.add.group();
    this.walls = this.physics.add.staticGroup();
    this.decorations = this.add.group();
    this.enemies = this.physics.add.group({ classType: Enemy });
    this.projectiles = this.physics.add.group({ classType: Projectile });

    // Create animations for the player
    this.anims.create({
      key: "idle_down",
      frames: this.anims.generateFrameNumbers("character", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle_left",
      frames: this.anims.generateFrameNumbers("character", {
        start: 4,
        end: 4,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle_right",
      frames: this.anims.generateFrameNumbers("character", {
        start: 8,
        end: 8,
      }),
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
      frames: this.anims.generateFrameNumbers("character", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_left",
      frames: this.anims.generateFrameNumbers("character", {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_right",
      frames: this.anims.generateFrameNumbers("character", {
        start: 8,
        end: 11,
      }),
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
      frames: this.anims.generateFrameNumbers("enemy_crab", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "crab_down",
      frames: this.anims.generateFrameNumbers("enemy_crab", {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "crab_left",
      frames: this.anims.generateFrameNumbers("enemy_crab", {
        start: 3,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "crab_right",
      frames: this.anims.generateFrameNumbers("enemy_crab", {
        start: 6,
        end: 8,
      }),
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
    this.startScreen.startGame();
  }

  // Function to start the game (can be called directly to bypass start screen)
  startGame() {
    // Mark game as started
    this.gameStarted = true;

    // Generate procedural map
    this.map = generateMap();

    console.log(this);

    // Render the map
    renderMapFromGenerator(
      this,
      this.map,
      this.floorLayer,
      this.walls,
      this.decorations
    );

    // Find a safe position for the player
    const safePosition = findSafePlayerPosition(this.map);

    // Create player using the first frame (0)
    this.player = this.physics.add.sprite(
      safePosition.x,
      safePosition.y,
      "character",
      0 // Use the first frame
    );

    // Scale the player to match the tile size
    this.player.setScale(2);

    // Adjust the player's physics body to make the hitbox smaller
    if (this.player.body) {
      // Make the player's collision box 16x16 (smaller than the sprite)
      this.player.body.setSize(14, 14);
      // Center the collision box (offset to center the 16x16 hitbox in the sprite)
      this.player.body.setOffset(2, 8);
    }

    // Set player depth to be above floor and walls
    this.player.setDepth(50);

    // Enable physics on the player
    // Don't use world bounds, we'll handle this with walls
    this.player.setCollideWorldBounds(false);

    // Add collision between player and walls
    this.physics.add.collider(this.player, this.walls);

    // Add collision between enemies and walls
    this.physics.add.collider(this.enemies, this.walls);

    // Add collision between enemies and player
    this.physics.add.collider(
      this.player,
      this.enemies,
      (playerObj, enemyObj) => {
        // Cast to proper types
        const playerSprite = playerObj as Phaser.Physics.Arcade.Sprite;
        const enemy = enemyObj as Enemy;

        // If shield is active, don't take damage
        if (this.shieldActive) {
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
          if (this.shieldSprite) {
            this.shieldSprite.setTint(0x00ffff);
            this.time.delayedCall(100, () => {
              if (this.shieldSprite) this.shieldSprite.clearTint();
            });
          }
          return;
        }

        // Only proceed if the enemy isn't already biting and player isn't in cooldown
        if (
          (enemy.anims.currentAnim &&
            (enemy.anims.currentAnim.key === "enemy_bite" ||
              enemy.anims.currentAnim.key === "enemy_swipe")) ||
          this.attackCooldown
        ) {
          return;
        }

        // Set attack cooldown
        this.attackCooldown = true;
        this.time.delayedCall(1000, () => {
          this.attackCooldown = false;
        });

        // Play swipe animation instead of bite
        const swipeAnim = this.add.sprite(enemy.x, enemy.y, "enemy_swipe");
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
        this.playerTakeDamage(10);

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
        this.tweens.add({
          targets: playerSprite,
          tint: 0xff0000,
          ease: "Linear",
          duration: 300,
          onComplete: () => {
            this.tweens.add({
              targets: playerSprite,
              tint: 0xffffff,
              ease: "Linear",
              duration: 300,
            });
          },
        });
      },
      undefined,
      this
    );

    // Add collision between enemies
    this.physics.add.collider(this.enemies, this.enemies);

    // Add collision between projectiles and walls
    this.physics.add.collider(
      this.projectiles,
      this.walls,
      this.handleProjectileWallCollision,
      undefined,
      this
    );

    // Add collision between projectiles and enemies
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileEnemyCollision,
      undefined,
      this
    );

    // Create player attack area (invisible)
    this.playerAttackArea = this.add.rectangle(
      0,
      0,
      tileSize * 1.25,
      tileSize * 1.25,
      0xff0000,
      0
    );
    this.physics.add.existing(this.playerAttackArea, false);
    if (this.playerAttackArea.body) {
      (
        this.playerAttackArea.body as Phaser.Physics.Arcade.Body
      ).setAllowGravity(false);
    }

    // Add overlap between attack area and enemies
    this.physics.add.overlap(
      this.playerAttackArea,
      this.enemies,
      this.handleAttackHit.bind(this),
      undefined,
      this
    );

    // Set camera to follow player
    // Set the camera bounds to match the actual map size
    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Create player health bar (fixed to camera)
    this.playerHealthBar = this.add.graphics();
    this.playerHealthBar.setScrollFactor(0);
    this.playerHealthBar.setDepth(100);
    this.updatePlayerHealthBar();

    // Create cooldown indicators
    this.createCooldownIndicators();

    // Spawn enemies
    spawnEnemiesFromGenerator(this, this.map, this.enemies);

    // Start with idle animation
    this.player.anims.play("idle_down");

    // Debug: Log map data to console
    console.log("Map generation complete");
  }

  // Create cooldown indicators for player abilities
  createCooldownIndicators() {
    const iconSize = 40;
    const iconSpacing = 10;
    const startX = 15;
    const startY = 55;

    // Basic attack indicator (projectile)
    this.cooldownIcons.basic = this.createCooldownIcon(
      startX,
      startY,
      iconSize,
      0x44aaff,
      "Z",
      "Projectile"
    );

    // Attack 2 indicator (melee slash)
    this.cooldownIcons.attack2 = this.createCooldownIcon(
      startX + iconSize + iconSpacing,
      startY,
      iconSize,
      0xff7700,
      "C",
      "Slash"
    );

    // Shield indicator
    this.cooldownIcons.shield = this.createCooldownIcon(
      startX + (iconSize + iconSpacing) * 2,
      startY,
      iconSize,
      0x44ff44,
      "X",
      "Shield"
    );
  }

  // Helper function to create a cooldown icon
  createCooldownIcon(
    x: number,
    y: number,
    size: number,
    color: number,
    keyText: string,
    abilityName: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(101);
    container.setScrollFactor(0);

    // Background
    const background = this.add.rectangle(
      size / 2,
      size / 2,
      size,
      size,
      0x333333,
      0.7
    );
    background.setStrokeStyle(2, 0xffffff, 0.8);

    // Icon (colored circle)
    const icon = this.add.circle(size / 2, size / 2, size / 2 - 4, color, 1);

    // Key binding text
    const keyLabel = this.add
      .text(size / 2, size / 2 - 2, keyText, {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Ability name below
    const nameLabel = this.add
      .text(size / 2, size + 2, abilityName, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    // Cooldown overlay (initially invisible)
    const cooldownOverlay = this.add.graphics();

    // Add all elements to the container
    container.add([background, icon, keyLabel, cooldownOverlay, nameLabel]);

    // Store the cooldown overlay and icon for later reference
    (container as any).cooldownOverlay = cooldownOverlay;
    (container as any).icon = icon;

    return container;
  }

  // Update cooldown indicators
  updateCooldownIndicators(time: number) {
    // Update basic attack cooldown
    this.updateCooldownIcon(
      this.cooldownIcons.basic,
      time,
      this.basicAttackCooldownEnd,
      500 // Duration matches the cooldown in the code
    );

    // Update attack 2 cooldown
    this.updateCooldownIcon(
      this.cooldownIcons.attack2,
      time,
      this.attack2CooldownEnd,
      800 // Duration matches the cooldown in the code
    );

    // Update shield cooldown
    if (this.shieldActive) {
      // If shield is active, show it as fully on cooldown
      this.updateCooldownIcon(
        this.cooldownIcons.shield,
        0, // Current time not needed for full overlay
        1, // End time not needed for full overlay
        1, // Duration not needed for full overlay
        true // Force full overlay
      );
    } else {
      // Normal cooldown visualization
      this.updateCooldownIcon(
        this.cooldownIcons.shield,
        time,
        this.shieldCooldownEnd,
        2000 // Shield cooldown duration
      );
    }
  }

  // Update a single cooldown icon
  updateCooldownIcon(
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
  update(time: number) {
    // Skip updating game state if game not started or player died
    if (!this.gameStarted || !this.player || !this.player.active) {
      return;
    }

    // Update cooldown indicators with current time
    this.updateCooldownIndicators(time);

    // Handle player movement
    this.updatePlayerMovement();

    // Update shield position to follow player
    this.updateShieldPosition();

    // Handle player attacks and abilities
    if (
      this.attackKey.isDown &&
      !this.attackCooldown &&
      time > this.basicAttackCooldownEnd
    ) {
      // Fire a projectile
      this.fireProjectile();

      // Set cooldown
      this.attackCooldown = true;
      this.basicAttackCooldownEnd = time + 500; // 500ms cooldown

      // Release cooldown after 300ms
      this.time.delayedCall(300, () => {
        this.attackCooldown = false;
      });
    }

    // Handle attack 2 (Slash)
    if (
      this.attackKey2.isDown &&
      !this.attackCooldown &&
      time > this.attack2CooldownEnd
    ) {
      // Perform attack 2
      this.performAttack2();

      // Set cooldown
      this.attackCooldown = true;
      this.attack2CooldownEnd = time + 800; // 800ms cooldown

      // Release cooldown after 500ms
      this.time.delayedCall(500, () => {
        this.attackCooldown = false;
      });
    }

    // Handle shield ability
    if (
      this.attackKey3.isDown &&
      !this.attackCooldown &&
      !this.shieldActive &&
      time > this.shieldCooldownEnd
    ) {
      // Activate shield
      this.activateShield();

      // Set cooldown (managed in activateShield function)
      this.shieldCooldownEnd = time + 4000; // 4 second total cooldown (2s active + 2s recovery)
    }

    // Check if the player is near the portal to the next level
    if (this.nextLevelPortal && this.player) {
      const distanceToPortal = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.nextLevelPortal.x,
        this.nextLevelPortal.y
      );

      if (distanceToPortal < 50) {
        // Go to the next level
        this.currentLevel++;
        // Regenerate map for the next level
        // This would ideally call a function to reset the level
        this.scene.restart();
      }
    }

    // Update enemies
    const player = this.player;
    this.enemies.getChildren().forEach((enemy: any) => {
      if (enemy.update) {
        enemy.update(time, player);
      }
    });
  }

  // Handle player movement
  updatePlayerMovement() {
    // Reset player velocity
    this.player.setVelocity(0);

    // Handle player movement
    const speed = 160;
    let moving = false;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.anims.play("walk_left", true);
      moving = true;
      this.playerFacing = "left";
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.anims.play("walk_right", true);
      moving = true;
      this.playerFacing = "right";
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
      if (!moving) {
        this.player.anims.play("walk_up", true);
      }
      moving = true;
      this.playerFacing = "up";
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      if (!moving) {
        this.player.anims.play("walk_down", true);
      }
      moving = true;
      this.playerFacing = "down";
    }

    // If not moving, play idle animation based on facing direction
    if (!moving) {
      this.player.anims.play(`idle_${this.playerFacing}`, true);
    }

    // Prevent player from going outside the map
    if (this.player.x < tileSize / 2) {
      this.player.x = tileSize / 2;
    } else if (this.player.x > mapWidth * tileSize - tileSize / 2) {
      this.player.x = mapWidth * tileSize - tileSize / 2;
    }
    if (this.player.y < tileSize / 2) {
      this.player.y = tileSize / 2;
    } else if (this.player.y > mapHeight * tileSize - tileSize / 2) {
      this.player.y = mapHeight * tileSize - tileSize / 2;
    }

    // Update attack area position based on player position and facing direction
    this.updateAttackAreaPosition(this.playerFacing);
  }

  // Fire a projectile in the direction the player is facing
  fireProjectile() {
    // Visual feedback for attack
    this.cameras.main.shake(100, 0.005);

    // Create a new projectile in the facing direction
    const offsetDistance = 20; // Distance from player center to spawn projectile
    let projectileX = this.player.x;
    let projectileY = this.player.y;

    // Adjust spawn position based on facing direction
    switch (this.playerFacing) {
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
      this.playerFacing
    );
    this.projectiles.add(projectile);
  }

  // Perform the second attack (melee slash in front of player)
  performAttack2() {
    // Calculate the position where the attack would appear
    let attackX = this.player.x;
    let attackY = this.player.y;
    let angle = 0;

    // Position the attack 100 units in front of the player
    switch (this.playerFacing) {
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
    const tempBody = this.physics.add.sprite(
      attackX,
      attackY,
      "player_attack_2"
    );
    tempBody.setVisible(false);
    tempBody.setSize(32, 32);

    // Check if the attack would hit a wall
    let willHitWall = false;
    let destructibleWall: any = null;

    this.physics.world.collide(tempBody, this.walls, (_tempBody, wallObj) => {
      willHitWall = true;

      // Try to access the wall object safely
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
      this.player.setTint(0xaaaaaa);
      this.time.delayedCall(100, () => {
        this.player.clearTint();
      });
      return;
    }

    // Create the attack animation sprite
    const attackAnim = this.add.sprite(attackX, attackY, "player_attack_2");
    attackAnim.setDepth(15);
    attackAnim.setAngle(angle);
    attackAnim.anims.play("attack2");

    // Create a physics body for the attack to detect collisions
    const attackArea = this.physics.add.sprite(
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
      const deathAnim = this.add.sprite(
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
      const floorTile = this.add.sprite(
        destructibleWall.x,
        destructibleWall.y,
        "dungeon_floor",
        tileIndex as number
      );
      floorTile.setScale(2);
      floorTile.setDepth(0); // Below walls and player
      this.floorLayer.add(floorTile);

      // Remove the wall after a short delay
      const wallToDestroy = destructibleWall;
      this.time.delayedCall(200, () => {
        if (wallToDestroy && typeof wallToDestroy.destroy === "function") {
          wallToDestroy.destroy();
        }
      });
    }

    // Check for enemies in range and damage them
    this.physics.add.overlap(
      attackArea,
      this.enemies,
      (_attackObj, enemyObj) => {
        const enemy = enemyObj as Enemy;

        // Apply damage to enemy
        const damage = 30;
        enemy.takeDamage(damage, this.player);
      }
    );

    // Clean up the attack area after animation completes
    attackAnim.once("animationcomplete", () => {
      attackAnim.destroy();
      attackArea.destroy();
    });
  }

  // Activate the shield
  activateShield() {
    // Set shield as active
    this.shieldActive = true;

    // Create shield sprite around player
    this.shieldSprite = this.add.sprite(
      this.player.x,
      this.player.y,
      "player_shield"
    );
    this.shieldSprite.setDepth(12); // Above player but below UI
    this.shieldSprite.setScale(1.5);

    // Play start animation
    this.shieldSprite.anims.play("shield_start");

    // When start animation completes, switch to idle
    this.shieldSprite.once("animationcomplete", () => {
      this.shieldSprite.anims.play("shield_idle");

      // Set a timer to end the shield after 2 seconds
      this.time.delayedCall(2000, () => {
        // Play end animation
        this.shieldSprite.anims.play("shield_end");

        // When end animation completes, destroy the shield
        this.shieldSprite.once("animationcomplete", () => {
          this.shieldSprite.destroy();
          this.shieldActive = false;

          // Set cooldown for 2 more seconds after shield ends
          this.attackCooldown = true;
          this.time.delayedCall(2000, () => {
            this.attackCooldown = false;
          });
        });
      });
    });
  }

  // Update the shield position to follow the player
  updateShieldPosition() {
    if (this.shieldActive && this.shieldSprite) {
      this.shieldSprite.x = this.player.x;
      this.shieldSprite.y = this.player.y;
    }
  }

  // Position the attack area based on player facing direction
  updateAttackAreaPosition(facing: string) {
    if (!this.playerAttackArea || !this.player) return;

    const offset = tileSize * 0.75;

    switch (facing) {
      case "left":
        this.playerAttackArea.setPosition(
          this.player.x - offset,
          this.player.y
        );
        break;
      case "right":
        this.playerAttackArea.setPosition(
          this.player.x + offset,
          this.player.y
        );
        break;
      case "up":
        this.playerAttackArea.setPosition(
          this.player.x,
          this.player.y - offset
        );
        break;
      case "down":
        this.playerAttackArea.setPosition(
          this.player.x,
          this.player.y + offset
        );
        break;
    }
  }

  // Handle attack hit on enemy
  handleAttackHit(_: any, object2: any) {
    if (!this.attackCooldown) return;

    // Cast to Enemy type - make sure we're getting the actual game object
    let enemyObj: any = object2;
    if (object2 instanceof Phaser.Physics.Arcade.Body) {
      enemyObj = object2.gameObject;
    }

    const enemy = enemyObj as Enemy;

    // Apply damage to enemy
    if (!enemy) return;

    // Apply damage and check if it was actually taken (not in cooldown)
    enemy.takeDamage(20, this.player); // Reduced damage from 25 to 20
  }

  // Handle projectile hitting a wall
  handleProjectileWallCollision(projectile: any, wallObj: any) {
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
        this.floorLayer.add(floorTile);

        // Remove the wall after a short delay
        this.time.delayedCall(200, () => {
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
  handleProjectileEnemyCollision(projectile: any, enemyObj: any) {
    const proj = projectile as Projectile;

    // Only damage if projectile is active
    if (proj.active) {
      const enemy = enemyObj as Enemy;

      // Apply damage to enemy
      enemy.takeDamage(20, this.player);

      // Make projectile disappear
      proj.hitTarget();
    }
  }

  // Update player health bar
  updatePlayerHealthBar() {
    if (!this.playerHealthBar) return;

    this.playerHealthBar.clear();

    const barWidth = 200;
    const barHeight = 24;
    const borderRadius = 8;
    const borderWidth = 2;
    const padding = 2;
    const x = 15;
    const y = 15;

    // Draw shadow
    this.playerHealthBar.fillStyle(0x000000, 0.3);
    this.playerHealthBar.fillRoundedRect(
      x + 2,
      y + 2,
      barWidth,
      barHeight,
      borderRadius
    );

    // Background (dark gray with transparency)
    this.playerHealthBar.fillStyle(0x333333, 0.7);
    this.playerHealthBar.fillRoundedRect(
      x,
      y,
      barWidth,
      barHeight,
      borderRadius
    );

    // Border
    this.playerHealthBar.lineStyle(borderWidth, 0xffffff, 0.8);
    this.playerHealthBar.strokeRoundedRect(
      x,
      y,
      barWidth,
      barHeight,
      borderRadius
    );

    // Health amount (gradient from green to yellow to red based on health)
    const healthPercent = this.playerHealth / 100;
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
      this.playerHealthBar.fillStyle(fillColor, 1);
      this.playerHealthBar.fillRoundedRect(
        x + padding,
        y + padding,
        healthWidth,
        barHeight - padding * 2,
        borderRadius - 2
      );
    }

    // Make sure health bar is fixed to camera
    this.playerHealthBar.setScrollFactor(0);
    this.playerHealthBar.setDepth(100); // Ensure it's always on top

    // Health text
    if (!this.children.getByName("healthText")) {
      this.add
        .text(x + barWidth / 2, y + barHeight / 2, `${this.playerHealth}/100`, {
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
      const healthText = this.children.getByName(
        "healthText"
      ) as Phaser.GameObjects.Text;
      healthText.setText(`${this.playerHealth}/100`);
      healthText.setPosition(x + barWidth / 2, y + barHeight / 2);
    }
  }

  playerTakeDamage(damage: number) {
    this.playerHealth -= damage;
    this.playerHealth = Math.max(0, this.playerHealth);

    // Update health bar
    this.updatePlayerHealthBar();

    // Visual feedback
    this.cameras.main.shake(150, 0.05);

    // Check for game over
    if (this.playerHealth <= 0) {
      this.triggerGameOver();
    }
  }

  // Handle game over state
  triggerGameOver() {
    // Display game over text
    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
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
    this.player.disableBody(true, false);
    this.player.setTint(0xff0000);

    // Stop all enemies
    this.enemies
      .getChildren()
      .forEach((enemy: Phaser.GameObjects.GameObject) => {
        const enemySprite = enemy as Enemy;
        enemySprite.disableBody(true, false);
        enemySprite.setTint(0x555555); // Gray out enemies

        // Stop any ongoing animations
        if (enemySprite.anims.isPlaying) {
          enemySprite.anims.stop();
        }
      });

    // Stop any projectiles
    this.projectiles
      .getChildren()
      .forEach((proj: Phaser.GameObjects.GameObject) => {
        const projectile = proj as Projectile;
        projectile.disableBody(true, false);
        projectile.setActive(false);
        projectile.setVisible(false);
      });

    // Add a restart button
    const restartButton = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 100,
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
      this.scene.restart();
      this.playerHealth = 100;
    });
  }
}

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
  scene: [GameScene],
};

// Initialize the game
new Phaser.Game(config);
