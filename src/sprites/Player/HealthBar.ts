export class HealthBar extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene) {
    super(scene);

    scene.add.existing(this);
  }

  updatePlayerHealthBar(playerHealth: number) {
    if (!this) return;

    this.clear();

    // Make sure health bar is fixed to camera
    this.setScrollFactor(0);
    this.setDepth(100); // Ensure it's always on top

    const barWidth = 200;
    const barHeight = 24;
    const borderRadius = 8;
    const borderWidth = 2;
    const padding = 2;
    const x = 15;
    const y = 15;

    // Draw shadow
    this.fillStyle(0x000000, 0.3);
    this.fillRoundedRect(x + 2, y + 2, barWidth, barHeight, borderRadius);

    // Background (dark gray with transparency)
    this.fillStyle(0x333333, 0.7);
    this.fillRoundedRect(x, y, barWidth, barHeight, borderRadius);

    // Border
    this.lineStyle(borderWidth, 0xffffff, 0.8);
    this.strokeRoundedRect(x, y, barWidth, barHeight, borderRadius);

    // Health amount (gradient from green to yellow to red based on health)
    const healthPercent = playerHealth / 100;
    const healthWidth = Math.max(0, healthPercent * (barWidth - padding * 2));

    // Choose color based on health percentage
    let fillColor;
    if (healthPercent > 0.6) {
      fillColor = 0x44ff44; // Green for high health
    } else if (healthPercent > 0.3) {
      fillColor = 0xffff00; // Yellow for medium health
    } else {
      fillColor = 0xff4444; // Red for low health
    }

    // Inner health bar with smaller radius
    if (healthWidth > 0) {
      this.fillStyle(fillColor, 1);
      this.fillRoundedRect(
        x + padding,
        y + padding,
        healthWidth,
        barHeight - padding * 2,
        borderRadius - 2
      );
    }

    // Health text
    if (!this.scene?.children?.getByName("healthText")) {
      this.scene?.add
        .text(x + barWidth / 2, y + barHeight / 2, `${playerHealth}/100`, {
          fontSize: "14px",
          fontFamily: "Arial",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101)
        .setName("healthText");
    } else {
      const healthText = this.scene?.children?.getByName(
        "healthText"
      ) as Phaser.GameObjects.Text;
      healthText.setText(`${playerHealth}/100`);
      healthText.setPosition(x + barWidth / 2, y + barHeight / 2);
    }
  }
}
