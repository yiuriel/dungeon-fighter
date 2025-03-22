import Phaser from "phaser";
import { Player } from "../sprites/Player/Player";

export class Mage extends Player {
  shieldActive: boolean;
  shieldSprite: Phaser.GameObjects.Sprite;
  attackKey2: Phaser.Input.Keyboard.Key;
  attackKey3: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number, frame?: number) {
    super(scene, x, y, "character", frame);

    // Initialize shield properties
    this.shieldActive = false;
    this.shieldSprite = scene.add.sprite(x, y, "shield");
    this.shieldSprite.setVisible(false);
    this.shieldSprite.setDepth(51); // Above player

    // Set up additional keyboard controls
    this.attackKey2 = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );
    this.attackKey3 = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q
    );
  }

  protected getPlayerType(): string {
    return "mage";
  }

  protected createAnimations(): void {
    // The animations should already be created in the scene,
    // so we don't need to recreate them here
  }

  // Override base methods with mage-specific values
  protected getMaxHealth(): number {
    return 100;
  }

  protected getMoveSpeed(): number {
    return 100;
  }

  protected getAttackDamage(): number {
    return 40;
  }

  protected getAttackCooldown(): number {
    return 500;
  }

  update(time: number, delta: number) {
    super.update(time, delta);

    // Update shield position to follow player
    if (this.shieldSprite) {
      this.shieldSprite.setPosition(this.x, this.y);
    }
  }
}
