import Phaser from "phaser";

export class NewLevelSign {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private currentLevel: number;
  private sign: Phaser.GameObjects.Text | null = null;
  private portal: Phaser.GameObjects.Ellipse | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    currentLevel: number
  ) {
    this.scene = scene;
    this.player = player;
    this.currentLevel = currentLevel;
  }

  create(): { sign: Phaser.GameObjects.Text, portal: Phaser.GameObjects.Ellipse } {
    const portalX = this.player.x + 100; // Place it a bit ahead of the player
    const portalY = this.player.y;

    // Create portal glow effect
    this.portal = this.scene.add.ellipse(portalX, portalY, 80, 80, 0x00ffff, 0.3);
    this.portal.setDepth(5);

    // Add pulsing animation to the glow
    this.scene.tweens.add({
      targets: this.portal,
      alpha: 0.6,
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Create the next level text
    this.sign = this.scene.add
      .text(
        portalX,
        portalY - 60,
        `LEVEL ${this.currentLevel} COMPLETE!\nENTER PORTAL`,
        {
          fontSize: "20px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(10);

    // Add a floating animation to the text
    this.scene.tweens.add({
      targets: this.sign,
      y: portalY - 70,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return { sign: this.sign, portal: this.portal };
  }

  destroy() {
    if (this.sign) {
      this.sign.destroy();
      this.sign = null;
    }

    if (this.portal) {
      this.portal.destroy();
      this.portal = null;
    }
  }

  isPlayerTouchingPortal(): boolean {
    if (!this.sign || !this.portal) return false;

    const playerBounds = this.player.getBounds();
    const signBounds = this.sign.getBounds();
    const portalBounds = this.portal.getBounds();

    return (
      Phaser.Geom.Rectangle.Overlaps(playerBounds, signBounds) ||
      Phaser.Geom.Rectangle.Overlaps(playerBounds, portalBounds)
    );
  }
}