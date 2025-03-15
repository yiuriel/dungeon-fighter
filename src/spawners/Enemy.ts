export class Enemy extends Phaser.Physics.Arcade.Sprite {
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
