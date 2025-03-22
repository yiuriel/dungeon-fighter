import { Enemy } from "./Enemy";

// Crab enemy implementation

export class EnemyCrab extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, frame?: number) {
    super(scene, x, y, "enemy_crab", frame);
  }

  protected getEnemyType(): string {
    return "crab";
  }

  protected getAnimationPrefix(): string {
    return "crab";
  }

  // Override base characteristics for crab
  protected getMaxHealth(): number {
    return 120; // Crabs have more health
  }

  protected getDamageCooldownDuration(): number {
    return 1200; // Longer cooldown between attacks
  }

  protected getMoveSpeed(): number {
    return 45; // Slower movement
  }

  protected getAttackDamage(): number {
    return 15; // Higher damage
  }

  protected createAnimations(): void {
    this.anims.create({
      key: `${this.getAnimationPrefix()}_idle`,
      frames: this.anims.generateFrameNumbers(`${this.getAnimationPrefix()}`, {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: `${this.getAnimationPrefix()}_down`,
      frames: this.anims.generateFrameNumbers(`${this.getAnimationPrefix()}`, {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: `${this.getAnimationPrefix()}_left`,
      frames: this.anims.generateFrameNumbers(`${this.getAnimationPrefix()}`, {
        start: 3,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: `${this.getAnimationPrefix()}_right`,
      frames: this.anims.generateFrameNumbers(`${this.getAnimationPrefix()}`, {
        start: 6,
        end: 8,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: `${this.getAnimationPrefix()}_up`,
      frames: this.anims.generateFrameNumbers(`${this.getAnimationPrefix()}`, {
        start: 9,
        end: 11,
      }),
      frameRate: 8,
      repeat: -1,
    });
  }
}
