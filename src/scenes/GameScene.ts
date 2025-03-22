import Phaser from "phaser";
import {
  generateMap,
  mapHeight,
  mapWidth,
  renderMap as renderMapFromGenerator,
  spawnEnemies as spawnEnemiesFromGenerator,
  tileSize,
  TILES,
} from "../map/mapGenerator";
import { Enemy } from "../sprites/Enemies/Enemy";
import { Projectile } from "../sprites/Projectile";
import { findSafePlayerPosition } from "../map/findSafePlayerPosition";
import { NewLevelSign } from "../helpers/new.level.sign";
import { StartScreen } from "../helpers/start.screen";
import { MagePlayer } from "../sprites/Player/Player";

/**
 * Main game scene that handles the dungeon gameplay
 */
export class GameScene extends Phaser.Scene {
  // Game variables
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map: number[][] = [];
  private floorLayer!: Phaser.GameObjects.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private decorations!: Phaser.GameObjects.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealth = 100;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private attackKey2!: Phaser.Input.Keyboard.Key; // Key for attack 2
  private attackKey3!: Phaser.Input.Keyboard.Key; // Key for shield
  private attackCooldown = false;
  private shieldActive = false; // Track if shield is active
  private shieldSprite!: Phaser.GameObjects.Sprite; // Sprite for shield animation
  private playerAttackArea!: Phaser.GameObjects.Rectangle;
  private projectiles!: Phaser.Physics.Arcade.Group; // Group for projectiles
  private playerFacing = "down"; // Track player facing direction
  private currentLevel = 1; // Track current level
  private levelSignManager: NewLevelSign | null = null; // Level sign manager
  private startScreen: StartScreen | null = null;
  private gameStarted = false;

  constructor() {
    super({ key: "GameScene" });
  }

  /**
   * Preload assets for the game
   */
  preload(): void {
    // Load character sprite sheet
    this.load.spritesheet("mage", "assets/characters/mage.png", {
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

    // Load projectile image
    this.load.image("projectile", "assets/projectiles/fireball.png");

    // Load death animation
    this.load.image("death", "assets/effects/death_1.png");

    // Load portal and sign
    this.load.image("portal", "assets/map/portal.png");
    this.load.image("sign", "assets/map/sign.png");

    // Load player attack animations
    this.load.spritesheet("player_attack", "assets/attack/player_attack.png", {
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
    this.load.spritesheet(
      "player_shield",
      "assets/attack/player_attack_3.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
  }

  /**
   * Create game objects and initialize the game
   */
  create(): void {
    // Create start screen
    this.startScreen = new StartScreen(this, () => {
      this.startGame();
    });

    // Initialize cursor keys for movement
    if (!this.input || !this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.attackKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
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

    // Create animations for the crab enemy
    this.createEnemyAnimations();

    // Start the game directly (bypassing start screen for now)
    this.startScreen.startGame();
  }

  /**
   * Create animations for enemies
   */
  createEnemyAnimations(): void {
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
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "octopus_left",
      frames: this.anims.generateFrameNumbers("enemy_octopus", {
        start: 3,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "octopus_right",
      frames: this.anims.generateFrameNumbers("enemy_octopus", {
        start: 6,
        end: 8,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "octopus_up",
      frames: this.anims.generateFrameNumbers("enemy_octopus", {
        start: 9,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Create player attack animations
    this.anims.create({
      key: "attack_down",
      frames: this.anims.generateFrameNumbers("player_attack", {
        start: 0,
        end: 4,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack_left",
      frames: this.anims.generateFrameNumbers("player_attack", {
        start: 5,
        end: 9,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack_right",
      frames: this.anims.generateFrameNumbers("player_attack", {
        start: 10,
        end: 14,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack_up",
      frames: this.anims.generateFrameNumbers("player_attack", {
        start: 15,
        end: 19,
      }),
      frameRate: 18,
      repeat: 0,
    });

    // Create player attack 2 animations (slash)
    this.anims.create({
      key: "attack2_down",
      frames: this.anims.generateFrameNumbers("player_attack_2", {
        start: 0,
        end: 4,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack2_left",
      frames: this.anims.generateFrameNumbers("player_attack_2", {
        start: 5,
        end: 9,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack2_right",
      frames: this.anims.generateFrameNumbers("player_attack_2", {
        start: 10,
        end: 14,
      }),
      frameRate: 18,
      repeat: 0,
    });

    this.anims.create({
      key: "attack2_up",
      frames: this.anims.generateFrameNumbers("player_attack_2", {
        start: 15,
        end: 19,
      }),
      frameRate: 18,
      repeat: 0,
    });

    // Create shield animations
    this.anims.create({
      key: "shield_down",
      frames: this.anims.generateFrameNumbers("player_shield", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shield_left",
      frames: this.anims.generateFrameNumbers("player_shield", {
        start: 1,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shield_right",
      frames: this.anims.generateFrameNumbers("player_shield", {
        start: 2,
        end: 2,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shield_up",
      frames: this.anims.generateFrameNumbers("player_shield", {
        start: 3,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  /**
   * Start the game
   * Can be called directly to bypass the start screen
   */
  startGame(): void {
    // Mark game as started
    this.gameStarted = true;

    // Generate procedural map
    this.map = generateMap();

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
    this.player = new MagePlayer(this, safePosition.x, safePosition.y);

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

    // Set player to not collide with world bounds
    this.player.setCollideWorldBounds(false);

    // Add collision between player and walls
    this.physics.add.collider(this.player, this.walls);

    // Add collision between enemies and walls
    this.physics.add.collider(this.enemies, this.walls);

    // Configure other collisions and gameplay setup...
    this.setupCollisions();

    // Create player health bar (fixed to camera)
    this.playerHealthBar = this.add.graphics();
    this.playerHealthBar.setScrollFactor(0);
    this.playerHealthBar.setDepth(100);
    this.updatePlayerHealthBar();

    // Spawn enemies
    spawnEnemiesFromGenerator(this, this.map, this.enemies);

    // Start with idle animation
    this.player.anims.play("idle_down");
  }

  /**
   * Setup collision handlers
   */
  setupCollisions(): void {
    // Add collision between enemies and player
    this.physics.add.collider(
      this.player,
      this.enemies,
      this.handlePlayerEnemyCollision,
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
      this.handleAttackHit,
      undefined,
      this
    );

    // Set camera to follow player
    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  /**
   * Player takes damage from enemies
   */
  playerTakeDamage(damage: number): void {
    // If shield is active, reduce damage by 80%
    if (this.shieldActive) {
      damage = Math.floor(damage * 0.2);

      // Visual feedback for shield blocking
      this.shieldSprite.setTint(0xff0000);
      this.time.delayedCall(100, () => {
        if (this.shieldSprite) {
          this.shieldSprite.clearTint();
        }
      });
    }

    // If player was recently damaged, don't take more damage (invincibility frames)
    if (this.player.tintTopLeft !== 0xffffff) {
      return;
    }

    // Reduce player health
    this.playerHealth = Math.max(0, this.playerHealth - damage);

    // Update health bar
    this.updatePlayerHealthBar();

    // Visual feedback (flash red)
    this.player.setTint(0xff0000);
    this.time.delayedCall(200, () => {
      this.player.clearTint();
    });

    // Check for game over
    if (this.playerHealth <= 0) {
      this.triggerGameOver();
    }
  }

  /**
   * Handle player collision with enemies
   */
  handlePlayerEnemyCollision(_player: any, enemyObj: any): void {
    // Cast to Enemy type for proper method access
    const enemy = enemyObj as Enemy;

    // If shield is active, push enemy back instead of taking damage
    if (this.shieldActive) {
      // Calculate direction from player to enemy
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;

      // Normalize and scale for knockback effect
      const dist = Math.sqrt(dx * dx + dy * dy);
      const knockbackForce = 200;
      const nx = (dx / dist) * knockbackForce;
      const ny = (dy / dist) * knockbackForce;

      // Apply knockback to enemy
      enemy.setVelocity(nx, ny);

      // Visual feedback
      enemy.setTint(0x0000ff);
      this.time.delayedCall(100, () => {
        enemy.clearTint();
      });

      return;
    }

    // Take damage from enemy based on its strength
    this.playerTakeDamage(enemy.attackDamage);

    // Knockback effect
    const knockbackForce = 150;
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.player.setVelocity(
        (dx / dist) * knockbackForce,
        (dy / dist) * knockbackForce
      );

      // Reset velocity after a short delay
      this.time.delayedCall(150, () => {
        if (this.player.active) {
          this.player.setVelocity(0, 0);
        }
      });
    }
  }

  /**
   * Handle projectile collision with walls
   */
  handleProjectileWallCollision(projectile: any, _wallObj: any): void {
    projectile.destroy();
  }

  /**
   * Handle projectile collision with enemies
   */
  handleProjectileEnemyCollision(projectile: any, enemyObj: any): void {
    const enemy = enemyObj as Enemy;
    enemy.takeDamage(25, this.player);
    projectile.destroy();
  }

  /**
   * Handle attack hit on enemies
   */
  handleAttackHit(_attackArea: any, enemyObj: any): void {
    if (this.attackCooldown) {
      const enemy = enemyObj as Enemy;
      enemy.takeDamage(30, this.player);
    }
  }

  /**
   * Update the health bar display
   */
  updatePlayerHealthBar(): void {
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

  /**
   * Update game state
   */
  update(_time: number, _delta: number): void {
    // Skip game logic if game hasn't started yet
    if (!this.gameStarted) return;

    // If player doesn't exist, return
    if (!this.player) return;

    // Reset velocity
    this.player.setVelocity(0);

    // Handle player movement
    this.updatePlayerMovement();

    // Update attack area position
    this.updateAttackAreaPosition(this.playerFacing);

    // Handle attack input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.fireProjectile();
    }

    // Handle attack 2 (melee) input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey2)) {
      this.performAttack2();
    }

    // Handle shield input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey3)) {
      this.activateShield();
    }

    // Update shield position if active
    if (this.shieldActive && this.shieldSprite) {
      this.updateShieldPosition();
    }

    // Check if all enemies are defeated
    const activeEnemies = this.enemies.getChildren().filter((enemy) => {
      return (enemy as Phaser.Physics.Arcade.Sprite).active;
    });

    // Handle level completion logic
    if (activeEnemies.length === 0 && !this.levelSignManager) {
      this.showNextLevelSign();
    }

    // Check for level sign interaction
    if (
      this.levelSignManager &&
      this.levelSignManager.isPlayerTouchingPortal()
    ) {
      this.goToNextLevel();
    }
  }

  /**
   * Show the next level sign and portal when all enemies are defeated
   */
  showNextLevelSign(): void {
    // Create level sign manager
    this.levelSignManager = new NewLevelSign(
      this,
      this.player,
      this.currentLevel
    );
    this.levelSignManager.create();
  }

  /**
   * Go to the next level
   */
  goToNextLevel(): void {
    // Increment level counter
    this.currentLevel++;

    // Clear existing objects
    if (this.levelSignManager) {
      this.levelSignManager.destroy();
      this.levelSignManager = null;
    }

    // Destroy all existing enemies
    this.enemies.clear(true, true);

    // Destroy all projectiles
    this.projectiles.clear(true, true);

    // Generate a new map
    this.map = generateMap();

    // Clear and recreate walls
    this.walls.clear(true, true);
    this.floorLayer.clear(true, true);
    this.decorations.clear(true, true);

    // Render the new map
    renderMapFromGenerator(
      this,
      this.map,
      this.floorLayer,
      this.walls,
      this.decorations
    );

    // Find a safe position for the player
    const safePosition = findSafePlayerPosition(this.map);
    this.player.setPosition(safePosition.x, safePosition.y);

    // Set up collisions again
    this.setupCollisions();

    // Spawn enemies for the new level
    spawnEnemiesFromGenerator(
      this,
      this.map,
      this.enemies,
      this.currentLevel - 1
    );

    // Reset player health and give bonus
    this.playerHealth = Math.min(100, this.playerHealth + 20); // Heal player by 20, up to max 100
    this.updatePlayerHealthBar();
  }

  /**
   * Handle player movement
   */
  updatePlayerMovement(): void {
    // Define movement speed
    const speed = 100;

    // Flag to track if the player is moving
    let isMoving = false;

    // WASD or Arrow key movement
    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      this.playerFacing = "left";
      isMoving = true;
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.playerFacing = "right";
      isMoving = true;
    }

    if (this.cursors.up?.isDown) {
      this.player.setVelocityY(-speed);
      this.playerFacing = "up";
      isMoving = true;
    } else if (this.cursors.down?.isDown) {
      this.player.setVelocityY(speed);
      this.playerFacing = "down";
      isMoving = true;
    }

    // Play the appropriate animation
    if (isMoving) {
      this.player.anims.play(`walk_${this.playerFacing}`, true);
    } else {
      this.player.anims.play(`idle_${this.playerFacing}`, true);
    }
  }

  /**
   * Fire a projectile in the direction the player is facing
   */
  fireProjectile(): void {
    // Create projectile at player position
    const projectile = this.projectiles.create(
      this.player.x,
      this.player.y,
      "projectile"
    ) as Phaser.Physics.Arcade.Sprite;

    // Set depth to be below the player
    projectile.setDepth(5);

    // Define projectile speed
    const projectileSpeed = 200;

    // Set velocity based on facing direction
    switch (this.playerFacing) {
      case "up":
        projectile.setVelocityY(-projectileSpeed);
        break;
      case "down":
        projectile.setVelocityY(projectileSpeed);
        break;
      case "left":
        projectile.setVelocityX(-projectileSpeed);
        break;
      case "right":
        projectile.setVelocityX(projectileSpeed);
        break;
    }

    // Destroy projectile after 2 seconds
    this.time.delayedCall(2000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }

  /**
   * Perform melee attack
   */
  performAttack2(): void {
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

    // If the attack would hit a wall but it's not destructible, don't allow the attack
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
    attackAnim.anims.play(`attack2_${this.playerFacing}`);

    // Create a physics body for the attack to detect collisions
    const attackArea = this.physics.add.sprite(
      attackX,
      attackY,
      "player_attack_2"
    );
    attackArea.setVisible(false); // Hide the actual physics sprite
    attackArea.setSize(24, 24); // Set hitbox to 24x24
    attackArea.setOffset(4, 4); // Center the hitbox (assuming 32x32 sprite)

    // If we found a destructible wall, destroy it
    if (destructibleWall) {
      // Create a destruction effect at the wall's position
      const deathAnim = this.add.sprite(
        destructibleWall.x,
        destructibleWall.y,
        "death"
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

  /**
   * Activate shield
   */
  activateShield(): void {
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

    // Play shield animation based on player facing direction
    this.shieldSprite.anims.play(`shield_${this.playerFacing}`);

    // Set a timer to end the shield after 2 seconds
    this.time.delayedCall(2000, () => {
      // Destroy the shield
      if (this.shieldSprite) {
        this.shieldSprite.destroy();
        this.shieldActive = false;
      }
    });
  }

  /**
   * Update shield position
   */
  updateShieldPosition(): void {
    if (this.shieldActive && this.shieldSprite) {
      this.shieldSprite.x = this.player.x;
      this.shieldSprite.y = this.player.y;

      // Update shield animation based on player facing direction
      this.shieldSprite.anims.play(`shield_${this.playerFacing}`, true);
    }
  }

  /**
   * Trigger game over state
   */
  triggerGameOver(): void {
    // Stop player movement
    this.player.setVelocity(0, 0);

    // Create game over text
    const gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      "GAME OVER",
      {
        fontFamily: "Arial",
        fontSize: "64px",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
        shadow: {
          blur: 5,
          color: "#000000",
          fill: true,
          offsetX: 2,
          offsetY: 2,
        },
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(100);

    // Add score text
    const levelText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 30,
      `You reached level ${this.currentLevel}`,
      {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      }
    );
    levelText.setOrigin(0.5);
    levelText.setScrollFactor(0);
    levelText.setDepth(100);

    // Add restart button
    const restartButton = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      "Restart Game",
      {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#222222",
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      }
    );
    restartButton.setOrigin(0.5);
    restartButton.setScrollFactor(0);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.setDepth(100);

    // Add hover effect
    restartButton.on("pointerover", () => {
      restartButton.setStyle({ color: "#ffff00" });
    });

    restartButton.on("pointerout", () => {
      restartButton.setStyle({ color: "#ffffff" });
    });

    // Add click handler
    restartButton.on("pointerdown", () => {
      // Restart the scene
      this.scene.restart();
    });

    // Fade out all enemies
    this.enemies.getChildren().forEach((enemy) => {
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 1000,
        ease: "Power2",
      });
    });

    // Dramatic death animation for player
    this.tweens.add({
      targets: this.player,
      angle: 90,
      alpha: 0,
      y: this.player.y + 20,
      duration: 1000,
      ease: "Power2",
    });
  }

  /**
   * Update attack area position
   */
  updateAttackAreaPosition(facing: string): void {
    // Position the attack area based on player facing direction
    if (!this.player || !this.playerAttackArea) return;

    // Offset from player center for attack area
    const offset = tileSize / 2;

    switch (facing) {
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
    }
  }
}
