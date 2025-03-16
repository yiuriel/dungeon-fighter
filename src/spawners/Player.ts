export abstract class Player extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  lastMoveTime: number;
  damageCooldown: boolean;
  damageCooldownDuration: number;
  moveSpeed: number;
  attackDamage: number;
  healthBar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);

    // Set default values
    this.maxHealth = this.getMaxHealth();
    this.health = this.maxHealth;
    this.lastMoveTime = 0;
    this.damageCooldown = false;
    this.damageCooldownDuration = this.getDamageCooldownDuration();
    this.moveSpeed = this.getMoveSpeed();
    this.attackDamage = this.getAttackDamage();
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(20);
    this.updateHealthBar();

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth
    this.setDepth(20);
  }

  protected abstract getMaxHealth(): number;
  protected abstract getDamageCooldownDuration(): number;
  protected abstract getMoveSpeed(): number;
  protected abstract getAttackDamage(): number;
  protected abstract updateHealthBar(): void;

  protected abstract createAnimations(): void;
}

export class MagePlayer extends Player {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "mage", 0);
  }

  protected getMaxHealth(): number {
    return 100;
  }

  protected getDamageCooldownDuration(): number {
    return 1000;
  }

  protected getMoveSpeed(): number {
    return 100;
  }

  protected getAttackDamage(): number {
    return 10;
  }

  protected updateHealthBar(): void {
    // Implementation for updating health bar
  }

  protected createAnimations(): void {
    // Implementation for creating animations
    this.anims.create({
      key: "idle_down",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle_left",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 4,
        end: 4,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle_right",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 8,
        end: 8,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle_up",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 12,
        end: 12,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_down",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_left",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_right",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 8,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walk_up",
      frames: this.anims.generateFrameNumbers("mage", {
        start: 12,
        end: 15,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }
}
