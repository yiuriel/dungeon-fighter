export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: number
  ) {
    super(scene, x, y, texture, frame);
  }
}
