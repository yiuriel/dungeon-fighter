import { mapHeight, mapWidth, tileSize } from "../../map/mapGenerator";
import { HealthBar } from "./HealthBar";
import { Projectile } from "../Projectile";

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
  private wallsKey!: Phaser.Input.Keyboard.Key;
  private wallsCooldown = 0;
  private damageCooldown = false;
  playerAttackArea!: Phaser.GameObjects.Rectangle;
  facing: "up" | "down" | "left" | "right" = "down";
  healthBar: HealthBar | null = null;
  health = 100;
  basicAttackDamage = 20;
  specialAttackDamage = 40;
  // Cooldown tracking
  cooldownIcons: {
    basic?: Phaser.GameObjects.Container;
    attack2?: Phaser.GameObjects.Container;
    shield?: Phaser.GameObjects.Container;
    walls?: Phaser.GameObjects.Container;
  } = {};

  walls: number = 0;

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
    this.wallsKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.V
    ); // V key for walls

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

    this.setWallCount();

    this.createCooldownIndicators();
  }

  setWallCount() {
    const wallsText = this.scene.add.text(
      this.healthBar!.x + 220,
      this.healthBar!.y + 16,
      `Walls: ${this.walls}`,
      {
        fontSize: 20,
        fontFamily: "Arial",
        color: "#fff",
        stroke: "#000",
        strokeThickness: 4,
      }
    );
    this.cooldownIcons.walls?.destroy();
    this.cooldownIcons.walls = this.scene.add.container(
      this.healthBar!.x + 10,
      this.healthBar!.y,
      [wallsText]
    );

    this.cooldownIcons.walls.setDepth(201);
    this.cooldownIcons.walls.setScrollFactor(0);
  }

  update(time: number) {
    this.updatePlayerMovement(time);
    this.updateShieldPosition();
    this.updateCooldownIndicators(time);

    this.setWallCount();
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

    // Handle walls placement
    if (this.wallsKey.isDown && time > this.wallsCooldown && this.walls > 0) {
      this.scene.events.emit("placeWall", this.x, this.y, this.facing);
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

    this.scene.events.emit("special_attack_fired", attackAnim);

    // // Clean up the attack area after animation completes
    attackAnim.once("animationcomplete", () => {
      attackAnim.destroy();
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

  createCooldownIndicators() {
    const iconSize = 40;
    const iconSpacing = 20;
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

  createCooldownIcon(
    x: number,
    y: number,
    size: number,
    color: number,
    keyText: string,
    abilityName: string
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);
    container.setScrollFactor(0);

    // Background
    const background = this.scene.add.rectangle(
      size / 2,
      size / 2,
      size,
      size,
      0x333333,
      0.7
    );
    background.setStrokeStyle(2, 0xffffff, 0.8);

    // Icon (colored circle)
    const icon = this.scene.add.circle(
      size / 2,
      size / 2,
      size / 2 - 4,
      color,
      1
    );

    // Key binding text
    const keyLabel = this.scene.add
      .text(size / 2, size / 2, keyText, {
        fontFamily: "Monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Ability name below
    const nameLabel = this.scene.add
      .text(size / 2, size + 4, abilityName, {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    // Cooldown overlay (initially invisible)
    const cooldownOverlay = this.scene.add.graphics();

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
      this.basicAttackCooldown,
      500 // Duration matches the cooldown in the code
    );

    // Update attack 2 cooldown
    this.updateCooldownIcon(
      this.cooldownIcons.attack2,
      time,
      this.specialAttackCooldown,
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
        this.shieldCooldown,
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

  addWallToPlayer() {
    if (this.walls >= 15) return;
    this.walls++;
  }

  wallPlaced() {
    this.walls--;
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
  getBasicAttackDamage() {
    return this.basicAttackDamage;
  }
  getSpecialAttackDamage() {
    return this.specialAttackDamage;
  }
}
