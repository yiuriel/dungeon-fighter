import { mapHeight, mapWidth, TILES, tileSize } from "../map/mapGenerator";
import { Projectile } from "./Projectile";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private basicAttackKey!: Phaser.Input.Keyboard.Key;
  private basicAttackCooldown = 0;
  private specialAttackKey!: Phaser.Input.Keyboard.Key;
  private specialAttackCooldown = 0;
  private shieldKey!: Phaser.Input.Keyboard.Key;
  private shieldCooldown = 0;
  playerAttackArea!: Phaser.GameObjects.Rectangle;
  facing: "up" | "down" | "left" | "right" = "down";
  projectiles!: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);

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
      this.fireProjectile();

      // Set cooldown
      this.basicAttackCooldown = time + 500; // 500ms cooldown

      // Release cooldown after 300ms
      this.scene.time.delayedCall(500, () => {
        this.basicAttackCooldown = 0;
      });
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

  fireProjectile() {
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
    const projectile = new Projectile(
      this.scene,
      projectileX,
      projectileY,
      this.facing
    );
    this.projectiles.add(projectile);
  }

  performAttack2() {
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

    // Create a temporary physics body to check for wall collisions
    const tempBody = this.scene.physics.add.sprite(
      attackX,
      attackY,
      "player_attack_2"
    );
    tempBody.setVisible(false);
    tempBody.setSize(32, 32);

    // Check if the attack would hit a wall
    let willHitWall = false;
    let destructibleWall: any = null;

    // this.scene.physics.world.collide(tempBody, this.walls, (_tempBody, wallObj) => {
    //   willHitWall = true;

    //   // Try to access the wall object safely
    //   try {
    //     if ((wallObj as any).isDestructible) {
    //       destructibleWall = wallObj;
    //     }
    //   } catch (e) {
    //     // Ignore errors if properties don't exist
    //   }
    // });

    // Destroy the temporary body
    tempBody.destroy();

    // If the attack would hit a wall but it's destructible, allow the attack
    if (willHitWall && !destructibleWall) {
      // Visual feedback that attack can't be performed
      this.setTint(0xaaaaaa);
      this.scene.time.delayedCall(100, () => {
        this.clearTint();
      });
      return;
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

    // If we found a destructible wall, destroy it
    if (destructibleWall) {
      // Create a destruction effect at the wall's position
      const deathAnim = this.scene.add.sprite(
        destructibleWall.x,
        destructibleWall.y,
        "brick_explotion"
      );
      deathAnim.setDepth(3);
      this.scene.time.delayedCall(200, () => {
        deathAnim.play("brick_explotion").once("animationcomplete", () => {
          deathAnim.destroy();
        });
      });

      // Add a floor tile where the wall was
      // const floorTileTypes = Object.values(TILES.FLOOR);
      // const tileIndex =
      //   floorTileTypes[Math.floor(Math.random() * floorTileTypes.length)];
      // const floorTile = this.scene.add.sprite(
      //   destructibleWall.x,
      //   destructibleWall.y,
      //   "dungeon_floor",
      //   tileIndex as number
      // );
      // floorTile.setScale(2);
      // floorTile.setDepth(0); // Below walls and player
      // this.scene.floorLayer.add(floorTile);

      // Remove the wall after a short delay
      const wallToDestroy = destructibleWall;
      this.scene.time.delayedCall(200, () => {
        if (wallToDestroy && typeof wallToDestroy.destroy === "function") {
          wallToDestroy.destroy();
        }
      });
    }

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
    // attackAnim.once("animationcomplete", () => {
    //   attackAnim.destroy();
    //   attackArea.destroy();
    // });
  }
}
