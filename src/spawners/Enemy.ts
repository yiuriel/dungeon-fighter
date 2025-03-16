export class Enemy extends Phaser.Physics.Arcade.Sprite {
  health: number;
  lastMoveTime: number;
  damageCooldown: boolean;
  healthBar: Phaser.GameObjects.Graphics;
  private targetPosition: { x: number; y: number } | null = null;
  private pathfindingCooldown: number = 0;
  enemyType: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);
    this.scene = scene;
    this.health = 100;
    this.lastMoveTime = 0;
    this.damageCooldown = false;
    this.enemyType = texture === "enemy_octopus" ? "octopus" : "crab";

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
    const healthWidth = Math.max(0, (this.health / 100) * 30);
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
    this.scene.time.delayedCall(1000, () => {
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

  update(time: number, player: Phaser.Physics.Arcade.Sprite) {
    this.updateHealthBar();

    // Skip if not active
    if (!this.active || !player.active) return;

    // Move randomly at intervals if not chasing player
    if (time > this.lastMoveTime && !this.targetPosition) {
      this.lastMoveTime = time + 2000;

      // Choose random direction
      const direction = Math.floor(Math.random() * 4);
      const speed = 50;

      // Reset velocity
      this.setVelocity(0);

      switch (direction) {
        case 0: // Left
          this.setVelocityX(-speed);
          this.anims.play(`${this.enemyType}_left`, true);
          break;
        case 1: // Right
          this.setVelocityX(speed);
          this.anims.play(`${this.enemyType}_right`, true);
          break;
        case 2: // Up
          this.setVelocityY(-speed);
          this.anims.play(`${this.enemyType}_up`, true);
          break;
        case 3: // Down
          this.setVelocityY(speed);
          this.anims.play(`${this.enemyType}_down`, true);
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
      this.moveTowardsPlayerSmartly(player, time);
    }

    // Update animation based on velocity if we're moving
    this.updateAnimationBasedOnVelocity();
  }

  // Smart movement that avoids walls
  moveTowardsPlayerSmartly(player: Phaser.Physics.Arcade.Sprite, time: number) {
    // Only recalculate path every 500ms to avoid jittery movement
    this.pathfindingCooldown = time + 500;

    // Get distance to player
    const distToPlayer = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y
    );

    // If player is too far, don't chase
    if (distToPlayer > 300) {
      this.targetPosition = null;
      return;
    }

    // Check if there's a direct line of sight to the player
    const hasLineOfSight = this.hasLineOfSightToPlayer(player);

    if (hasLineOfSight) {
      // Direct path to player
      this.targetPosition = { x: player.x, y: player.y };
      this.scene.physics.moveToObject(this, player, 60);
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
      const testX = this.x + dir.x * 50;
      const testY = this.y + dir.y * 50;

      // Check if moving in this direction would hit a wall
      const wouldHitWall = this.wouldPositionHitWall(testX, testY);

      if (!wouldHitWall) {
        // Found a good direction, move that way
        this.targetPosition = { x: testX, y: testY };
        this.scene.physics.moveTo(this, testX, testY, 60);
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

      // Check if circle intersects with wall
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
        this.anims.play(`${this.enemyType}_right`, true);
      } else {
        this.anims.play(`${this.enemyType}_left`, true);
      }
    } else {
      // Moving vertically
      if (this.body.velocity.y > 0) {
        this.anims.play(`${this.enemyType}_down`, true);
      } else {
        this.anims.play(`${this.enemyType}_up`, true);
      }
    }
  }
}
