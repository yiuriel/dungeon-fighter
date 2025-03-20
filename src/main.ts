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
import { Enemy } from "./sprites/Enemy";
import { Projectile } from "./sprites/Projectile";
import "./style.css";
import { findSafePlayerPosition } from "./map/findSafePlayerPosition";
import { NewLevelSign } from "./helpers/new.level.sign";
import { StartScreen } from "./helpers/start.screen";
import { Player } from "./sprites/Player";
import { Attack } from "./sprites/Attack/types";

class GameScene extends Phaser.Scene {
  // Game variables
  player!: Player;
  map: number[][] = [];
  floorLayer!: Phaser.GameObjects.Group;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  enemies!: Phaser.Physics.Arcade.Group;
  basicAttacksGroup!: Phaser.Physics.Arcade.Group; // Group for projectiles
  specialAttacksGroup!: Phaser.Physics.Arcade.Group; // Group for projectiles
  currentLevel = 1; // Track current level
  nextLevelSign: Phaser.GameObjects.Text | null = null; // Next level sign
  nextLevelPortal: Phaser.GameObjects.Ellipse | null = null; // Portal visual
  levelSignManager: NewLevelSign | null = null; // Level sign manager
  startScreen: StartScreen | null = null;
  gameStarted = false;

  constructor() {
    super();
  }

  // Preload assets
  preload() {
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

    this.load.spritesheet("brick_explotion", "assets/explotions/brick.png", {
      frameWidth: 48,
      frameHeight: 48,
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

    // Create floor, wall, and decoration groups
    this.floorLayer = this.add.group();
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ classType: Enemy });
    this.basicAttacksGroup = this.physics.add.group({ classType: Projectile });
    this.specialAttacksGroup = this.physics.add.group();

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

    // Create brick explode animation
    this.anims.create({
      key: "brick_explotion",
      frames: this.anims.generateFrameNumbers("brick_explotion", {
        start: 0,
        end: 8,
      }),
      frameRate: 20,
      repeat: 0,
    });

    // Show the start screen
    this.startScreen.startGame();

    this.events.on("basic_attack_fired", (projectile: Projectile) => {
      this.basicAttacksGroup.add(projectile);
    });

    this.events.on(
      "special_attack_fired",
      (projectile: Phaser.GameObjects.Sprite) => {
        this.specialAttacksGroup.add(projectile);
      }
    );

    this.events.on("game_over", this.triggerGameOver.bind(this));
  }

  // Function to start the game (can be called directly to bypass start screen)
  startGame() {
    // Mark game as started
    this.gameStarted = true;

    // Generate procedural map
    this.map = generateMap();

    // Render the map
    renderMapFromGenerator(this, this.map, this.floorLayer, this.walls);

    // Find a safe position for the player
    const safePosition = findSafePlayerPosition(this.map);

    // Create player using the first frame (0)
    this.player = new Player(
      this,
      safePosition.x,
      safePosition.y,
      "character",
      0 // Use the first frame
    );

    // Add collision between player and walls
    this.physics.add.collider(this.player, this.walls);

    // Add collision between enemies and walls
    this.physics.add.collider(this.enemies, this.walls);

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
      this.basicAttacksGroup,
      this.walls,
      this.handleProjectileWallCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.specialAttacksGroup,
      this.walls,
      this.handleSpecialAttackHit,
      undefined,
      this
    );

    // Add collision between projectiles and enemies
    this.physics.add.overlap(
      this.basicAttacksGroup,
      this.enemies,
      this.handleProjectileEnemyCollision,
      undefined,
      this
    );

    // Add collision between special attacks and enemies
    this.physics.add.overlap(
      this.specialAttacksGroup,
      this.enemies,
      this.handleEnemySpecialAttackHit,
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

    // Spawn enemies
    spawnEnemiesFromGenerator(this, this.map, this.enemies);

    // Debug: Log map data to console
    console.log("Map generation complete");
  }

  // Update game state
  update(time: number) {
    // Skip updating game state if game not started or player died
    if (!this.gameStarted || !this.player || !this.player.active) {
      return;
    }

    // Handle player movement
    this.player.update(time);

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
    this.basicAttacksGroup.clear(true, true);

    // Generate a new map
    this.map = generateMap();

    // Clear and recreate walls
    this.walls.clear(true, true);
    this.floorLayer.clear(true, true);

    // Render the new map
    renderMapFromGenerator(this, this.map, this.floorLayer, this.walls);

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
  }

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
      this.basicAttacksGroup,
      this.walls,
      this.handleProjectileWallCollision,
      undefined,
      this
    );

    // Add collision between projectiles and enemies
    this.physics.add.overlap(
      this.basicAttacksGroup,
      this.enemies,
      this.handleProjectileEnemyCollision,
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

  handlePlayerEnemyCollision(playerSprite: any, enemy: any) {
    if (this.player.getDamageCooldown()) return;

    // If shield is active, don't take damage
    if (this.player.getShieldActive()) {
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
      this.player.tintShield();
      return;
    }

    // Only proceed if the enemy isn't already biting and player isn't in cooldown
    if (
      enemy.anims.currentAnim &&
      (enemy.anims.currentAnim.key === "enemy_bite" ||
        enemy.anims.currentAnim.key === "enemy_swipe")
    ) {
      return;
    }

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
    this.player.playerTakeDamage(10);

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
  }

  handleEnemySpecialAttackHit(attack: any, enemyObj: any) {
    if (enemyObj instanceof Enemy) {
      // Only damage if projectile is active
      const enemy = enemyObj;

      // Check if projectile is past a certain frame, if so, don't damage
      const animation = attack.anims.currentAnim;
      console.log(attack.active, animation);
      if (
        animation &&
        attack.anims.currentFrame &&
        attack.anims.currentFrame?.index >= animation.frames.length / 2
      ) {
        console.log("Don't damage if past last frame");
        return; // Don't damage if past last frame
      }

      // Apply damage to enemy
      enemy.takeDamage(this.player.getSpecialAttackDamage(), this.player);

      // Start disappearing animation
      this.hitTarget(attack);
    }
  }

  hitTarget(attack: Attack, animation?: string) {
    if (attack.active && !attack.isDisappearing) {
      attack.isDisappearing = true;
      if (attack.setVelocity) attack.setVelocity(0, 0);
      if (animation) {
        attack.anims.play(animation, true).once("animationcomplete", () => {
          attack.active = false;
          attack.destroy();
        });
      } else {
        if (attack.anims.currentAnim && attack.anims.isPlaying) {
          attack.once("animationcomplete", () => {
            attack.active = false;
            attack.destroy();
          });
        } else {
          attack.active = false;
          attack.destroy();
        }
      }
    }
  }

  handleSpecialAttackHit(_: any, wallObj: any) {
    let destructibleWall: any = null;

    // Try to access the wall object safely
    try {
      if ((wallObj as any).isDestructible) {
        destructibleWall = wallObj;
      }
    } catch (e) {
      // Ignore errors if properties don't exist
    } finally {
      // Destroy the attack sprite
      if (destructibleWall) {
        // Create a destruction effect at the wall's position
        const deathAnim = this.add.sprite(
          destructibleWall.x,
          destructibleWall.y,
          "brick_explotion"
        );
        deathAnim.setDepth(3);
        this.time.delayedCall(200, () => {
          deathAnim.play("brick_explotion").once("animationcomplete", () => {
            deathAnim.destroy();
          });
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
    }
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
        const deathAnim = scene.add.sprite(wall.x, wall.y, "brick_explotion");
        deathAnim.setDepth(3);
        this.time.delayedCall(200, () => {
          deathAnim.play("brick_explotion").once("animationcomplete", () => {
            deathAnim.destroy();
          });
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
    this.hitTarget(projectile, "projectile_disappear");
  }

  // Handle projectile hitting an enemy
  handleProjectileEnemyCollision(projectile: any, enemyObj: any) {
    // Only damage if projectile is active
    if (
      projectile.active &&
      enemyObj instanceof Enemy &&
      projectile instanceof Projectile
    ) {
      const enemy = enemyObj;

      console.log(projectile.anims.currentAnim);

      // Apply damage to enemy
      enemy.takeDamage(this.player.getBasicAttackDamage(), this.player);

      // Make projectile disappear
      this.hitTarget(projectile, "projectile_disappear");
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
        if (enemy instanceof Enemy) {
          enemy.disableBody(true, false);
          enemy.setTint(0x555555); // Gray out enemies

          // Stop any ongoing animations
          if (enemy.anims.isPlaying) {
            enemy.anims.stop();
          }
        }
      });

    // Stop any projectiles
    this.basicAttacksGroup
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
      debug: true, // Enable debug rendering
    },
  },
  scene: [GameScene],
};

// Initialize the game
new Phaser.Game(config);
