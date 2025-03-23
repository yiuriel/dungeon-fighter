import { Enemy } from "./Enemy";

// Octopus enemy implementation

export class EnemyOctopus extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    map: number[][],
    player: Phaser.Physics.Arcade.Sprite,
    frame?: number
  ) {
    super(scene, x, y, "enemy_octopus", map, player, frame);
  }

  protected getEnemyType(): string {
    return "octopus";
  }

  protected getAnimationPrefix(): string {
    return "octopus";
  }

  // Override base characteristics for octopus
  protected getMaxHealth(): number {
    return 80; // Less health than crab
  }

  protected getDamageCooldownDuration(): number {
    return 800; // Faster attack rate
  }

  protected getMoveSpeed(): number {
    return 60; // Faster movement
  }

  protected getAttackDamage(): number {
    return 8; // Less damage per hit
  }

  protected createAnimations(): void {
    console.log(this.getAnimationPrefix());

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
