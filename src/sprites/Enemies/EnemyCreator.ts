import { Enemy } from "./Enemy";
import { EnemyCrab } from "./Crab";
import { EnemyOctopus } from "./Octopus";

// Factory function to create the appropriate enemy type

export function createEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  type: string,
  map: number[][],
  player: Phaser.Physics.Arcade.Sprite
): Enemy {
  if (type === "enemy_octopus") {
    return new EnemyOctopus(scene, x, y, map, player);
  } else {
    return new EnemyCrab(scene, x, y, map, player);
  }
}
