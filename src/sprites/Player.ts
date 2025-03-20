import { mapHeight, mapWidth, tileSize } from "../map/mapGenerator";
import { HealthBar } from "./Player/HealthBar";
import { Projectile } from "./Projectile";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private basicAttackKey!: Phaser.Input.Keyboard.Key;
  private basicAttackCooldown = 0;
  private specialAttackKey!: Phaser.Input.Keyboard.Key;
  private specialAttackCooldown = 0;
  private shieldKey!: Phaser.Input.Keyboard.Key;
  private shieldCooldown = 0;
  private shieldActive = false;
  private shieldSprite: Phaser.GameObjects.Sprite | null = null;
  private damageCooldown = false;
  playerAttackArea!: Phaser.GameObjects.Rectangle;
  facing: "up" | "down" | "left" | "right" = "down";
  healthBar: HealthBar | null = null;
  health = 100;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);

    this.healthBar = new HealthBar(scene);
    this.healthBar.updatePlayerHealthBar(this.health);

    this.scene = scene;

    if (!scene.input || !scene.input.keyboard) {
      return;
    }
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.basicAttackKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.Z
    );
    this.specialAttackKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.C
    ); // C key for attack 2
    this.shieldKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.X
    ); // X key for shield

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth
    this.setScale(2);

    // Adjust the player's physics body to make the hitbox smaller
    if (this.body) {
      // Make the player's collision box 16x16 (smaller than the sprite)
      this.body.setSize(14, 14);
      // Center the collision box (offset to center the 16x16 hitbox in the sprite)
      this.body.setOffset(2, 8);
    }

    // Set player depth to be above floor and walls
    this.setDepth(50);

    this.setCollideWorldBounds(false);

    this.playerAttackArea = scene.add.rectangle(
      0,
      0,
      tileSize * 1.25,
      tileSize * 1.25,
      0xff0000,
      0
    );

    scene.physics.add.existing(this.playerAttackArea, false);
    if (this.playerAttackArea.body) {
      (
        this.playerAttackArea.body as Phaser.Physics.Arcade.Body
      ).setAllowGravity(false);
    }

    this.anims.play("idle_down");
  }

  update(time: number) {
    this.updatePlayerMovement(time);
    this.updateShieldPosition();
  }

  updatePlayerMovement(time: number) {
    // Reset player velocity
    this.setVelocity(0);

    // Handle player movement
    const speed = 160;
    let moving = false;

    if (this.cursors.left.isDown) {
      this.setVelocityX(-speed);
      this.anims.play("walk_left", true);
      moving = true;
      this.facing = "left";
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(speed);
      this.anims.play("walk_right", true);
      moving = true;
      this.facing = "right";
    }

    if (this.cursors.up.isDown) {
      this.setVelocityY(-speed);
      if (!moving) {
        this.anims.play("walk_up", true);
      }
      moving = true;
      this.facing = "up";
    } else if (this.cursors.down.isDown) {
      this.setVelocityY(speed);
      if (!moving) {
        this.anims.play("walk_down", true);
      }
      moving = true;
      this.facing = "down";
    }

    // If not moving, play idle animation based on facing direction
    if (!moving) {
      this.anims.play(`idle_${this.facing}`, true);
    }

    // Prevent player from going outside the map
    if (this.x < tileSize / 2) {
      this.x = tileSize / 2;
    } else if (this.x > mapWidth * tileSize - tileSize / 2) {
      this.x = mapWidth * tileSize - tileSize / 2;
    }
    if (this.y < tileSize / 2) {
      this.y = tileSize / 2;
    } else if (this.y > mapHeight * tileSize - tileSize / 2) {
      this.y = mapHeight * tileSize - tileSize / 2;
    }

    // Update attack area position based on player position and facing direction
    this.updateAttackAreaPosition(this.facing);

    if (this.basicAttackKey.isDown && time > this.basicAttackCooldown) {
      // Fire a projectile
      this.doBasicAttack();

      // Set cooldown
      this.basicAttackCooldown = time + 500; // 500ms cooldown

      // Release cooldown after 300ms
      this.scene.time.delayedCall(500, () => {
        this.basicAttackCooldown = 0;
      });
    }

    if (
      this.specialAttackKey.isDown &&
      !this.specialAttackCooldown &&
      time > this.specialAttackCooldown
    ) {
      // Perform attack 2
      this.doSpecialAttack();

      // Set cooldown
      this.specialAttackCooldown = time + 800; // 800ms cooldown

      // Release cooldown after 500ms
      this.scene.time.delayedCall(500, () => {
        this.specialAttackCooldown = 0;
      });
    }

    if (
      this.shieldKey.isDown &&
      !this.shieldActive &&
      time > this.shieldCooldown
    ) {
      // Activate shield
      this.activateShield();

      // Set cooldown (managed in activateShield function)
      this.shieldCooldown = time + 4000; // 4 second total cooldown (2s active + 2s recovery)
    }
  }

  updateAttackAreaPosition(facing: string) {
    if (!this.playerAttackArea) return;

    const offset = tileSize * 0.75;

    switch (facing) {
      case "left":
        this.playerAttackArea.setPosition(this.x - offset, this.y);
        break;
      case "right":
        this.playerAttackArea.setPosition(this.x + offset, this.y);
        break;
      case "up":
        this.playerAttackArea.setPosition(this.x, this.y - offset);
        break;
      case "down":
        this.playerAttackArea.setPosition(this.x, this.y + offset);
        break;
    }
  }

  doBasicAttack() {
    // Visual feedback for attack
    this.scene.cameras.main.shake(100, 0.005);

    // Create a new projectile in the facing direction
    const offsetDistance = 20; // Distance from player center to spawn projectile
    let projectileX = this.x;
    let projectileY = this.y;

    // Adjust spawn position based on facing direction
    switch (this.facing) {
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
    this.scene.events.emit(
      "basic_attack_fired",
      new Projectile(this.scene, projectileX, projectileY, this.facing)
    );
  }

  doSpecialAttack() {
    // Calculate the position where the attack would appear
    let attackX = this.x;
    let attackY = this.y;
    let angle = 0;

    // Position the attack 100 units in front of the player
    switch (this.facing) {
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

    // Create the attack animation sprite
    const attackAnim = this.scene.add.sprite(
      attackX,
      attackY,
      "player_attack_2"
    );
    attackAnim.setDepth(15);
    attackAnim.setAngle(angle);
    attackAnim.anims.play("attack2");

    // Create a physics body for the attack to detect collisions
    const attackArea = this.scene.physics.add.sprite(
      attackX,
      attackY,
      "player_attack_2"
    );
    attackArea.setVisible(false); // Hide the actual physics sprite
    attackArea.setSize(24, 24); // Set hitbox to 16x16
    attackArea.setOffset(4, 4); // Center the hitbox (assuming 32x32 sprite)
    this.scene.events.emit("special_attack_fired", attackArea);

    // Check for enemies in range and damage them
    // this.scene.physics.add.overlap(
    //   attackArea,
    //   this.scene.enemies,
    //   (_attackObj, enemyObj) => {
    //     const enemy = enemyObj as Enemy;

    //     // Apply damage to enemy
    //     const damage = 30;
    //     enemy.takeDamage(damage, this);
    //   }
    // );

    // // Clean up the attack area after animation completes
    attackAnim.once("animationcomplete", () => {
      attackAnim.destroy();
      attackArea.destroy();
    });
  }

  activateShield() {
    // Set shield as active
    this.shieldActive = true;

    // Create shield sprite around player
    this.shieldSprite = this.scene.add.sprite(this.x, this.y, "player_shield");
    this.shieldSprite.setDepth(12); // Above player but below UI
    this.shieldSprite.setScale(1.5);

    // Play start animation
    this.shieldSprite?.anims.play("shield_start");

    // When start animation completes, switch to idle
    this.shieldSprite?.once("animationcomplete", () => {
      this.shieldSprite?.anims.play("shield_idle");

      // Set a timer to end the shield after 2 seconds
      this.scene.time.delayedCall(2000, () => {
        // Play end animation
        this.shieldSprite?.anims.play("shield_end");

        // When end animation completes, destroy the shield
        this.shieldSprite?.once("animationcomplete", () => {
          this.shieldSprite?.destroy();
          this.shieldActive = false;

          // Set cooldown for 2 more seconds after shield ends
          this.shieldCooldown = 2000;
          this.scene.time.delayedCall(2000, () => {
            this.shieldCooldown = 0;
          });
        });
      });
    });
  }

  // Update the shield position to follow the player
  updateShieldPosition() {
    if (this.shieldActive && this.shieldSprite) {
      this.shieldSprite.x = this.x;
      this.shieldSprite.y = this.y;
    }
  }

  tintShield() {
    if (this.shieldSprite) {
      this.shieldSprite.setTint(0x00ffff);
      this.scene.time.delayedCall(100, () => {
        if (this.shieldSprite) this.shieldSprite.clearTint();
      });
    }
  }

  playerTakeDamage(damage: number) {
    if (this.damageCooldown) return;

    this.damageCooldown = true;

    if (!this.healthBar) return;

    this.health -= damage;
    this.health = Math.max(0, this.health);

    // Update health bar
    this.healthBar.updatePlayerHealthBar(this.health);

    // Visual feedback
    this.scene?.cameras?.main?.shake(150, 0.05);

    // Check for game over
    if (this.health <= 0) {
      this.scene?.events?.emit("game_over");
    }

    this.scene.time.delayedCall(1000, () => {
      this.damageCooldown = false;
    });
  }

  // Getters
  getBasicAttackCooldown() {
    return this.basicAttackCooldown;
  }
  getSpecialAttackKey() {
    return this.specialAttackKey;
  }
  getSpecialAttackCooldown() {
    return this.specialAttackCooldown;
  }
  getShieldKey() {
    return this.shieldKey;
  }
  getShieldCooldown() {
    return this.shieldCooldown;
  }
  getShieldActive() {
    return this.shieldActive;
  }
  getShieldSprite() {
    return this.shieldSprite;
  }
  getPlayerAttackArea() {
    return this.playerAttackArea;
  }
  getDamageCooldown() {
    return this.damageCooldown;
  }
}
