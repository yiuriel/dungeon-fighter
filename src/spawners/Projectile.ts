export class Projectile extends Phaser.Physics.Arcade.Sprite {
  direction: string;
  active: boolean;
  isDisappearing: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: string) {
    super(scene, x, y, "attack_projectile", 0);
    this.direction = direction;
    this.active = false;
    this.isDisappearing = false;

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth to be above floor but below player
    this.setDepth(5);

    // Set appropriate velocity based on direction
    const speed = 300;
    switch (direction) {
      case "left":
        this.setVelocityX(-speed);
        this.setAngle(180); // Rotate sprite to face left
        break;
      case "right":
        this.setVelocityX(speed);
        break;
      case "up":
        this.setVelocityY(-speed);
        this.setAngle(270); // Rotate sprite to face up
        break;
      case "down":
        this.setVelocityY(speed);
        this.setAngle(90); // Rotate sprite to face down
        break;
    }

    // Play the launch animation
    this.active = true;
    this.anims.play("projectile_launch");

    // When launch animation completes, switch to idle animation
    this.once("animationcomplete-projectile_launch", () => {
      this.anims.play("projectile_idle", true);
    });

    // Set timeout for projectile to disappear if it doesn't hit anything
    this.scene.time.delayedCall(750, () => {
      if (this.active && !this.isDisappearing) {
        this.startDisappearing();
      }
    });

    // Listen for animation complete events
    this.on("animationcomplete", this.handleAnimationComplete, this);
  }

  handleAnimationComplete(animation: Phaser.Animations.Animation) {
    if (animation.key === "projectile_disappear") {
      this.destroy();
    }
  }

  startDisappearing() {
    if (this.isDisappearing) return;

    this.isDisappearing = true;
    this.setVelocity(0, 0);
    this.anims
      .play("projectile_disappear", true)
      .once("animationcomplete", () => {
        this.active = false;
        this.destroy();
      });
  }

  hitTarget() {
    if (this.active && !this.isDisappearing) {
      this.startDisappearing();
    }
  }

  // Override the preUpdate method to ensure the projectile keeps moving
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    // Ensure velocity is maintained (in case it's reset elsewhere)
    if (this.active && this.body && !this.isDisappearing) {
      const speed = 200;
      switch (this.direction) {
        case "left":
          this.body.velocity.x = -speed;
          break;
        case "right":
          this.body.velocity.x = speed;
          break;
        case "up":
          this.body.velocity.y = -speed;
          break;
        case "down":
          this.body.velocity.y = speed;
          break;
      }
    }
  }
}
