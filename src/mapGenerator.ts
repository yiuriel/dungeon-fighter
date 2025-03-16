import { createEnemy } from "./spawners/Enemy";

// Map generation constants and variables
export const tileSize = 32; // Display size of tiles
export let mapWidth = 40;
export let mapHeight = 32;

// Tile indices in the spritesheet
export const TILES = {
  // Floor tiles (row 1)
  FLOOR: {
    BASIC: 269,
    CRACKED: 257,
    DIRTY: 258,
  },
  // Wall tiles (row 2)
  WALL: {
    BASIC: 16,
    DAMAGED: 16,
    DECORATED: 16,
  },
  // Decorations (row 3-4)
  DECORATION: {
    TORCH: 192,
    BARREL: 193,
    CHEST: 194,
    BONES: 195,
    BLOOD: 196,
    SLIME: 197,
  },
};

// Generate a procedural map using cellular automata
export function generateMap(): number[][] {
  // Initialize map with random walls and floors
  let map: number[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    map[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      // Make the edges walls
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        map[y][x] = 1; // Wall
      } else {
        // Random walls and floors in the interior
        map[y][x] = Math.random() < 0.4 ? 1 : 0;
      }
    }
  }

  // Apply cellular automata to smooth the map
  for (let i = 0; i < 4; i++) {
    map = applyCellularAutomata(map);
  }

  // Create a few rooms to ensure playable space
  createRooms(map);

  // Ensure the center of the map is a floor tile for player spawn
  const centerX = Math.floor(mapWidth / 2);
  const centerY = Math.floor(mapHeight / 2);
  map[centerY][centerX] = 0;
  // Also clear a small area around the player spawn
  for (let y = centerY - 2; y <= centerY + 2; y++) {
    for (let x = centerX - 2; x <= centerX + 2; x++) {
      if (y >= 0 && y < mapHeight && x >= 0 && x < mapWidth) {
        map[y][x] = 0;
      }
    }
  }

  return map;
}

// Apply cellular automata rules to smooth the map
function applyCellularAutomata(oldMap: number[][]): number[][] {
  let newMap: number[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    newMap[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      // Count walls in 3x3 neighborhood
      let wallCount = 0;
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          // Check if the neighbor is within bounds
          if (
            y + ny >= 0 &&
            y + ny < mapHeight &&
            x + nx >= 0 &&
            x + nx < mapWidth
          ) {
            if (oldMap[y + ny][x + nx] === 1) {
              wallCount++;
            }
          } else {
            // Count out-of-bounds as walls
            wallCount++;
          }
        }
      }

      // Apply cellular automata rules
      if (oldMap[y][x] === 1) {
        // If cell is a wall
        newMap[y][x] = wallCount >= 4 ? 1 : 0;
      } else {
        // If cell is a floor
        newMap[y][x] = wallCount >= 5 ? 1 : 0;
      }

      // Keep edges as walls
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        newMap[y][x] = 1;
      }
    }
  }

  return newMap;
}

// Create a few rooms to ensure playable space
function createRooms(map: number[][]): void {
  // Create a few random rooms
  for (let i = 0; i < 5; i++) {
    const roomWidth = Math.floor(Math.random() * 5) + 5;
    const roomHeight = Math.floor(Math.random() * 5) + 5;
    const roomX = Math.floor(Math.random() * (mapWidth - roomWidth - 2)) + 1;
    const roomY = Math.floor(Math.random() * (mapHeight - roomHeight - 2)) + 1;

    // Carve out the room
    for (let y = roomY; y < roomY + roomHeight; y++) {
      for (let x = roomX; x < roomX + roomWidth; x++) {
        if (y >= 0 && y < mapHeight && x >= 0 && x < mapWidth) {
          map[y][x] = 0;
        }
      }
    }
  }
}

// Render the map in the scene
export function renderMap(
  scene: Phaser.Scene,
  map: number[][],
  floorLayer: Phaser.GameObjects.Group,
  walls: Phaser.Physics.Arcade.StaticGroup,
  decorations: Phaser.GameObjects.Group
) {
  // Fill the entire map with black background first
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      // Add a black background tile everywhere
      const backgroundTile = scene.add.rectangle(
        tileX + tileSize / 2,
        tileY + tileSize / 2,
        tileSize,
        tileSize,
        0x000000
      );
      backgroundTile.setDepth(-1); // Set background to lowest depth
    }
  }

  // Then create all floor tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      // Only add floor tiles where the map indicates (not on walls)
      if (map[y][x] === 0) {
        // Select floor tile type based on position and randomness
        let tileIndex = TILES.FLOOR.BASIC;
        const rand = Math.random();
        if (rand < 0.1) {
          tileIndex = TILES.FLOOR.CRACKED;
        } else if (rand < 0.2) {
          tileIndex = TILES.FLOOR.DIRTY;
        }

        // Create the floor tile
        const floorTile = scene.add.sprite(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "tileset",
          tileIndex
        );
        floorTile.setScale(2); // Scale up the tile to match tileSize
        floorLayer.add(floorTile);

        // Randomly add decorations to some floor tiles
        if (Math.random() < 0.05) {
          // Select a random decoration
          const decorationTypes = Object.values(TILES.DECORATION);
          const decorationIndex =
            decorationTypes[Math.floor(Math.random() * decorationTypes.length)];

          // Create the decoration sprite
          const decoration = scene.add.sprite(
            tileX + tileSize / 2,
            tileY + tileSize / 2,
            "tileset",
            decorationIndex
          );
          decoration.setScale(2);
          decoration.setDepth(1); // Above floor, below walls
          decorations.add(decoration);
        }
      } else {
        // Create wall tile
        const wall = walls.create(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "tileset",
          TILES.WALL.BASIC
        );
        wall.setScale(2);
        wall.setDepth(2); // Set walls to be above floor and decorations

        // Update the physics body size to match the scaled sprite
        if (wall.body) {
          wall.body.setSize(tileSize, tileSize);
          wall.body.setOffset(-6, -8);
        }
      }
    }
  }
}

// Spawn enemies at random positions on the map
export function spawnEnemies(
  map: number[][],
  enemies: Phaser.Physics.Arcade.Group,
  additionalEnemies: number = 0
) {
  // Number of enemies to spawn
  const enemyCount = 2 + additionalEnemies;

  // Keep track of spawned positions to avoid overlaps
  const spawnedPositions: { x: number; y: number }[] = [];

  // Get player position (center of map)
  const playerX = Math.floor(mapWidth / 2);
  const playerY = Math.floor(mapHeight / 2);

  for (let i = 0; i < enemyCount; i++) {
    let x: number = 0;
    let y: number = 0;
    let attempts = 0;
    let validPosition = false;

    // Try to find a valid position (floor tile, not near player)
    while (!validPosition && attempts < 100) {
      x = Math.floor(Math.random() * (mapWidth - 2)) + 1;
      y = Math.floor(Math.random() * (mapHeight - 2)) + 1;

      // Check if position is a floor tile
      const isFloor = map[y][x] === 0;

      // Check if position is far enough from player (at least 5 tiles)
      const distanceFromPlayer = Math.sqrt(
        Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2)
      );
      const isFarFromPlayer = distanceFromPlayer > 5;

      // Check if position is not already used
      const isUnique = !spawnedPositions.some(
        (pos) => pos.x === x && pos.y === y
      );

      if (isFloor && isFarFromPlayer && isUnique) {
        validPosition = true;
        spawnedPositions.push({ x, y });
      }

      attempts++;
    }

    // If we found a valid position, spawn an enemy
    if (validPosition) {
      // Randomly choose between crab and octopus
      const enemyType = Math.random() < 0.5 ? "enemy_crab" : "enemy_octopus";
      
      // Create the appropriate enemy type using the factory function
      const enemy = createEnemy(
        enemies.scene, 
        x * tileSize + tileSize / 2,
        y * tileSize + tileSize / 2,
        enemyType
      );
      
      // Add the enemy to the group
      enemies.add(enemy);
      
      // Make sure the enemy is active and visible
      enemy.setActive(true);
      enemy.setVisible(true);
    }
  }
}
