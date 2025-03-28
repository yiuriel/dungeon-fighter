import EasyStar from "easystarjs";

// Base Enemy class that implements common functionality
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  lastMoveTime: number;
  damageCooldown: boolean;
  damageCooldownDuration: number;
  moveSpeed: number;
  attackDamage: number;
  healthBar: Phaser.GameObjects.Graphics;
  protected targetPosition: { x: number; y: number } | null = null;
  protected pathfindingCooldown: number = 0;
  enemyType: string;
  protected map: number[][];
  protected pathfinder: any;
  protected speed: number = 0;
  protected player: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    map: number[][],
    player: Phaser.Physics.Arcade.Sprite,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);

    this.player = player;
    this.map = map; // Store the 2D map
    this.pathfinder = new EasyStar.js();
    this.pathfinder.setGrid(this.map);
    this.pathfinder.setAcceptableTiles([0]); // Only floor tiles are walkable
    // this.pathfinder.enableDiagonals();
    this.speed = this.getMoveSpeed(); // Pixels per second

    this.createAnimations();
    this.scene = scene;

    // Set default values
    this.maxHealth = this.getMaxHealth();
    this.health = this.maxHealth;
    this.lastMoveTime = 0;
    this.damageCooldown = false;
    this.damageCooldownDuration = this.getDamageCooldownDuration();
    this.moveSpeed = this.getMoveSpeed();
    this.attackDamage = this.getAttackDamage();
    this.enemyType = this.getEnemyType();

    // Create health bar
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(20);
    this.updateHealthBar();

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth
    this.setDepth(20);
  }

  // Abstract methods to be implemented by subclasses
  protected abstract getEnemyType(): string;
  protected abstract getAnimationPrefix(): string;
  protected abstract createAnimations(): void;

  // Methods for enemy characteristics that can be overridden by subclasses
  protected getMaxHealth(): number {
    return 100; // Default max health
  }

  protected getDamageCooldownDuration(): number {
    return 1000; // Default cooldown in ms
  }

  protected getMoveSpeed(): number {
    return 50; // Default move speed
  }

  protected getAttackDamage(): number {
    return 10; // Default attack damage
  }

  followPlayer(player: Phaser.Physics.Arcade.Sprite) {
    const startX = Math.floor(this.x / 32);
    const startY = Math.floor(this.y / 32);
    const endX = Math.floor(player.x / 32);
    const endY = Math.floor(player.y / 32);

    this.pathfinder.findPath(
      startX,
      startY,
      endX,
      endY,
      (path: { x: number; y: number }[]) => {
        if (path && path.length > 1) {
          this.moveAlongPath(path, player);
        }
      }
    );

    this.pathfinder.calculate();
  }

  moveAlongPath(
    path: { x: number; y: number }[],
    player: Phaser.Physics.Arcade.Sprite
  ) {
    if (path.length <= 1) return;

    const nextTile = path[1]; // Get the next tile in the path
    const nextX = nextTile.x * 32 + 16; // Center of tile
    const nextY = nextTile.y * 32 + 16;

    this.scene.tweens.add({
      targets: this,
      x: nextX,
      y: nextY,
      duration: 500, // Adjust speed
      onComplete: () => {
        this.followPlayer(player); // Recursively find the next move
      },
    });
  }

  updateHealthBar() {
    this.healthBar.clear();

    const barWidth = 30;
    const barHeight = 6;
    const borderRadius = 3;
    const padding = 1;

    // Position above the enemy
    const x = this.x - barWidth / 2;
    const y = this.y - this.height / 2 - 10;

    // Background (dark with transparency)
    this.healthBar.fillStyle(0x333333, 0.7);
    this.healthBar.fillRoundedRect(x, y, barWidth, barHeight, borderRadius);

    // Border
    this.healthBar.lineStyle(1, 0xffffff, 0.5);
    this.healthBar.strokeRoundedRect(x, y, barWidth, barHeight, borderRadius);

    // Health fill
    if (this.health > 0) {
      // Calculate health percentage
      const healthPercent = this.health / this.maxHealth;
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

      // Draw the health bar with rounded corners
      this.healthBar.fillStyle(fillColor, 1);

      // Only use rounded corners if there's enough health to show them
      if (healthWidth > borderRadius * 2) {
        this.healthBar.fillRoundedRect(
          x + padding,
          y + padding,
          healthWidth,
          barHeight - padding * 2,
          borderRadius - 1
        );
      } else {
        // For very low health, just draw a rectangle to avoid visual glitches
        this.healthBar.fillRect(
          x + padding,
          y + padding,
          healthWidth,
          barHeight - padding * 2
        );
      }
    }
  }

  takeDamage(amount: number, player: Phaser.Physics.Arcade.Sprite) {
    // Check if enemy is in damage cooldown
    if (this.damageCooldown) return;

    // Apply damage
    const prevHealth = this.health;
    this.health -= amount;
    this.health = Math.max(0, this.health);
    this.updateHealthBar();

    // Only apply knockback if damage was taken
    if (this.health < prevHealth) {
      // Calculate knockback direction based on player position
      const knockbackForce = 80;
      const angle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        this.x,
        this.y
      );

      if (this.active) {
        this.setVelocity(
          Math.cos(angle) * knockbackForce,
          Math.sin(angle) * knockbackForce
        );
      }

      // Briefly disable enemy movement decisions during knockback
      this.lastMoveTime = this.scene.time.now + 500;

      // Visual feedback
      this.setTint(0xff0000);
      this.scene.time.delayedCall(this.damageCooldownDuration, () => {
        if (this.active) {
          this.clearTint();
        }
      });
    }

    // Set damage cooldown
    this.damageCooldown = true;
    this.scene.time.delayedCall(this.damageCooldownDuration, () => {
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

    // Stop any movement
    this.setVelocity(0, 0);

    // Create the death animation sprite but don't play it immediately
    const deathAnim = this.scene.add.sprite(this.x, this.y + 10, "death_1");
    deathAnim.setDepth(this.depth - 1); // Set just below enemy so we can see it

    // Make the enemy invisible immediately
    this.setVisible(false);

    // Play the death animation after a short delay (200ms)
    this.scene.time.delayedCall(200, () => {
      deathAnim.play("death_animation");
    });

    // When animation completes, destroy the animation sprite
    deathAnim.on("animationcomplete", () => {
      deathAnim.destroy();
    });

    // Destroy the enemy physics body immediately, but keep the game object for the delay
    if (this.body) {
      this.body.enable = false;
    }

    // Destroy the enemy after the animation delay
    this.scene.time.delayedCall(200, () => {
      this.destroy();
    });
  }

  update(time: number, player: Phaser.Physics.Arcade.Sprite) {
    this.updateHealthBar();

    // Skip if not active
    if (!this.active || !player.active) return;

    // Move randomly at intervals if not chasing player
    if (time > this.lastMoveTime && !this.targetPosition) {
      this.lastMoveTime = time + 2000;

      // Choose random direction
      const direction = Math.floor(Math.random() * 4);
      const speed = this.moveSpeed;

      // Reset velocity
      this.setVelocity(0);

      switch (direction) {
        case 0: // Left
          this.setVelocityX(-speed);
          this.anims.play(`${this.getAnimationPrefix()}_left`, true);
          break;
        case 1: // Right
          this.setVelocityX(speed);
          this.anims.play(`${this.getAnimationPrefix()}_right`, true);
          break;
        case 2: // Up
          this.setVelocityY(-speed);
          this.anims.play(`${this.getAnimationPrefix()}_up`, true);
          break;
        case 3: // Down
          this.setVelocityY(speed);
          this.anims.play(`${this.getAnimationPrefix()}_down`, true);
          break;
      }
    }

    // Smart pathfinding towards player
    if (
      this.active &&
      this.scene.physics &&
      player.active &&
      !this.damageCooldown &&
      time > this.pathfindingCooldown
    ) {
      // this.moveTowardsPlayerSmartly(player, time);
    }

    // Update animation based on velocity if we're moving
    this.updateAnimationBasedOnVelocity();
  }

  // Smart movement that avoids walls
  moveTowardsPlayerSmartly(player: Phaser.Physics.Arcade.Sprite, time: number) {
    // Only recalculate path every 500ms to avoid jittery movement
    this.pathfindingCooldown = time + 1000;

    // Get distance to player
    const distToPlayer = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y
    );

    // If player is too far, don't chase
    if (distToPlayer > 400) {
      this.targetPosition = null;
      return;
    }

    // Check if there's a direct line of sight to the player
    const hasLineOfSight = this.hasLineOfSightToPlayer(player);

    if (hasLineOfSight) {
      // Direct path to player
      this.targetPosition = { x: player.x, y: player.y };
      this.scene.physics.moveToObject(this, player, this.moveSpeed + 10); // Slightly faster when chasing directly
    } else {
      // No direct path, try to find a way around obstacles
      this.findPathAroundObstacles(player);
    }
  }

  // Check if there's a clear line of sight to the player
  hasLineOfSightToPlayer(player: Phaser.Physics.Arcade.Sprite): boolean {
    // Get walls from the scene
    const walls = this.scene.physics.world.staticBodies;

    // Create a line from enemy to player
    const line = new Phaser.Geom.Line(this.x, this.y, player.x, player.y);

    // Check if line intersects with any wall
    let hasLineOfSight = true;

    // Iterate through all static bodies (walls)
    walls.iterate((wallBody: Phaser.Physics.Arcade.StaticBody) => {
      // Create a rectangle for the wall
      const wallRect = new Phaser.Geom.Rectangle(
        wallBody.x,
        wallBody.y,
        wallBody.width,
        wallBody.height
      );

      // Check if line intersects with wall
      if (Phaser.Geom.Intersects.LineToRectangle(line, wallRect)) {
        hasLineOfSight = false;
        return false; // Stop iteration when we find an intersection
      }
      return true; // Continue iteration
    });

    return hasLineOfSight;
  }

  // Find a path around obstacles to reach the player
  findPathAroundObstacles(player: Phaser.Physics.Arcade.Sprite) {
    // Try several potential directions to move around obstacles
    const potentialDirections = [
      { x: 1, y: 0 }, // right
      { x: -1, y: 0 }, // left
      { x: 0, y: 1 }, // down
      { x: 0, y: -1 }, // up
      { x: 1, y: 1 }, // down-right
      { x: -1, y: 1 }, // down-left
      { x: 1, y: -1 }, // up-right
      { x: -1, y: -1 }, // up-left
    ];

    // Get vector from enemy to player
    const toPlayerX = player.x - this.x;
    const toPlayerY = player.y - this.y;

    // Sort directions by how closely they align with direction to player
    potentialDirections.sort((a, b) => {
      const dotA = a.x * toPlayerX + a.y * toPlayerY;
      const dotB = b.x * toPlayerX + b.y * toPlayerY;
      return dotB - dotA; // Higher dot product = more aligned with player direction
    });

    // Try each direction until we find one that doesn't hit a wall
    for (const dir of potentialDirections) {
      // Create a test position 50 pixels in this direction
      const testX = this.x + dir.x * 100;
      const testY = this.y + dir.y * 100;

      // Check if moving in this direction would hit a wall
      const wouldHitWall = this.wouldPositionHitWall(testX, testY);

      if (!wouldHitWall) {
        // Found a good direction, move that way
        this.targetPosition = { x: testX, y: testY };
        this.scene.physics.moveTo(this, testX, testY, this.moveSpeed);
        return;
      }
    }

    // If all directions hit walls, just stop
    this.setVelocity(0, 0);
  }

  // Check if a position would intersect with a wall
  wouldPositionHitWall(x: number, y: number): boolean {
    // Get walls from the scene
    const walls = this.scene.physics.world.staticBodies;

    // Create a small circle at the test position
    const testCircle = new Phaser.Geom.Circle(x, y, 16);

    // Check if circle intersects with any wall
    let wouldHit = false;

    // Iterate through all static bodies (walls)
    walls.iterate((wallBody: Phaser.Physics.Arcade.StaticBody) => {
      // Create a rectangle for the wall
      const wallRect = new Phaser.Geom.Rectangle(
        wallBody.x,
        wallBody.y,
        wallBody.width,
        wallBody.height
      );

      // Check if circle intersects with rectangle
      if (Phaser.Geom.Intersects.CircleToRectangle(testCircle, wallRect)) {
        wouldHit = true;
        return false; // Stop iteration when we find an intersection
      }
      return true; // Continue iteration
    });

    return wouldHit;
  }

  // Update animation based on velocity direction
  updateAnimationBasedOnVelocity() {
    if (!this.body) return;

    if (this.body.velocity.x === 0 && this.body.velocity.y === 0) {
      // Not moving, don't change animation
      return;
    }

    // Determine which direction we're moving most strongly in
    const absVelX = Math.abs(this.body.velocity.x);
    const absVelY = Math.abs(this.body.velocity.y);

    if (absVelX > absVelY) {
      // Moving horizontally
      if (this.body.velocity.x > 0) {
        this.anims.play(`${this.getAnimationPrefix()}_right`, true);
      } else {
        this.anims.play(`${this.getAnimationPrefix()}_left`, true);
      }
    } else {
      // Moving vertically
      if (this.body.velocity.y > 0) {
        this.anims.play(`${this.getAnimationPrefix()}_down`, true);
      } else {
        this.anims.play(`${this.getAnimationPrefix()}_up`, true);
      }
    }
  }
}
