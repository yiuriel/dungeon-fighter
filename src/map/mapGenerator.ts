import { createEnemy } from "../sprites/Enemy";
// Map generation constants and variables
export const tileSize = 32; // Display size of tiles
export let mapWidth = 40;
export let mapHeight = 32;

// Tile indices in the spritesheet
export const TILES = {
  // Floor tiles (row 1)
  FLOOR: {
    BASIC: 0,
    FLOOR_1: 1,
    FLOOR_2: 2,
    FLOOR_3: 3,
    FLOOR_4: 4,
    FLOOR_5: 5,
    FLOOR_6: 6,
    FLOOR_7: 7,
    FLOOR_8: 8,
    FLOOR_9: 9,
    FLOOR_10: 10,
    FLOOR_11: 11,
  },
  // Wall tiles (row 2)
  WALL: {
    WALL: 18,
    TOP_LEFT: 0,
    TOP_1: 1,
    TOP_2: 2,
    TOP_RIGHT: 3,
    LEFT: 6,
    LEFT_CONNECT_BOTTOM: 10,
    RIGHT_CONNECT_BOTTOM: 11,
    RIGHT: 9,
    BOTTOM_LEFT: 12,
    BOTTOM_1_LOWER: 13,
    BOTTOM_1_HIGHER: 7,
    BOTTOM_2_LOWER: 14,
    BOTTOM_2_HIGHER: 8,
    BOTTOM_RIGHT: 15,
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
  for (let i = 0; i < 6; i++) {
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

  // Ensure there are no isolated areas
  ensureConnectivity(map, centerX, centerY);

  return map;
}

// Ensure all floor tiles are connected (no isolated areas)
function ensureConnectivity(
  map: number[][],
  startX: number,
  startY: number
): void {
  // Create a copy of the map to mark visited tiles
  const visited: boolean[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    visited[y] = [];
    for (let x = 0; x < mapWidth; x++) {
      visited[y][x] = false;
    }
  }

  // Use flood fill algorithm to mark all accessible floor tiles
  floodFill(map, visited, startX, startY);

  // Find all floor tiles that weren't visited and connect them
  for (let y = 1; y < mapHeight - 1; y++) {
    for (let x = 1; x < mapWidth - 1; x++) {
      if (map[y][x] === 0 && !visited[y][x]) {
        // This is an isolated floor tile, connect it to the main area
        connectToMainArea(map, visited, x, y);
      }
    }
  }
}

// Flood fill algorithm to mark all accessible floor tiles
function floodFill(
  map: number[][],
  visited: boolean[][],
  x: number,
  y: number
): void {
  // Check if position is valid
  if (
    x < 0 ||
    x >= mapWidth ||
    y < 0 ||
    y >= mapHeight ||
    map[y][x] === 1 || // Wall
    visited[y][x] // Already visited
  ) {
    return;
  }

  // Mark as visited
  visited[y][x] = true;

  // Visit neighbors (4 directions)
  floodFill(map, visited, x + 1, y);
  floodFill(map, visited, x - 1, y);
  floodFill(map, visited, x, y + 1);
  floodFill(map, visited, x, y - 1);
}

// Connect an isolated area to the main area
function connectToMainArea(
  map: number[][],
  visited: boolean[][],
  x: number,
  y: number
): void {
  // Find the closest visited floor tile
  let closestX = -1;
  let closestY = -1;
  let minDistance = Infinity;

  for (let ny = 1; ny < mapHeight - 1; ny++) {
    for (let nx = 1; nx < mapWidth - 1; nx++) {
      if (map[ny][nx] === 0 && visited[ny][nx]) {
        const distance = Math.sqrt(Math.pow(nx - x, 2) + Math.pow(ny - y, 2));
        if (distance < minDistance) {
          minDistance = distance;
          closestX = nx;
          closestY = ny;
        }
      }
    }
  }

  // If we found a visited floor tile, create a path to it
  if (closestX !== -1 && closestY !== -1) {
    createPath(map, x, y, closestX, closestY);

    // Mark the newly connected area as visited
    const newVisited: boolean[][] = [];
    for (let ny = 0; ny < mapHeight; ny++) {
      newVisited[ny] = [];
      for (let nx = 0; nx < mapWidth; nx++) {
        newVisited[ny][nx] = visited[ny][nx];
      }
    }
    floodFill(map, newVisited, x, y);

    // Update the visited array
    for (let ny = 0; ny < mapHeight; ny++) {
      for (let nx = 0; nx < mapWidth; nx++) {
        visited[ny][nx] = newVisited[ny][nx];
      }
    }
  }
}

// Create a path between two points
function createPath(
  map: number[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  // Simple line drawing algorithm
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  while (x1 !== x2 || y1 !== y2) {
    // Set current position to floor
    map[y1][x1] = 0;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x1 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y1 += sy;
    }
  }
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
  walls: Phaser.Physics.Arcade.StaticGroup
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

  // First pass: Add floor tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tileX = x * tileSize;
      const tileY = y * tileSize;

      // Only add floor tiles where the map indicates (not on walls)
      if (map[y][x] === 0) {
        // Select floor tile type based on position and randomness
        let tileIndex;
        const rand = Math.random();

        // Distribute different floor tile types
        if (rand < 0.5) {
          tileIndex = TILES.FLOOR.BASIC;
        } else if (rand < 0.6) {
          tileIndex = TILES.FLOOR.FLOOR_1;
        } else if (rand < 0.7) {
          tileIndex = TILES.FLOOR.FLOOR_2;
        } else if (rand < 0.75) {
          tileIndex = TILES.FLOOR.FLOOR_3;
        } else if (rand < 0.8) {
          tileIndex = TILES.FLOOR.FLOOR_4;
        } else if (rand < 0.85) {
          tileIndex = TILES.FLOOR.FLOOR_5;
        } else if (rand < 0.9) {
          tileIndex = TILES.FLOOR.FLOOR_6;
        } else if (rand < 0.92) {
          tileIndex = TILES.FLOOR.FLOOR_7;
        } else if (rand < 0.94) {
          tileIndex = TILES.FLOOR.FLOOR_8;
        } else if (rand < 0.96) {
          tileIndex = TILES.FLOOR.FLOOR_9;
        } else if (rand < 0.98) {
          tileIndex = TILES.FLOOR.FLOOR_10;
        } else {
          tileIndex = TILES.FLOOR.FLOOR_11;
        }

        // Create the floor tile
        const floorTile = scene.add.sprite(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "dungeon_floor",
          tileIndex
        );
        floorTile.setScale(2); // Scale up the tile to match tileSize
        floorLayer.add(floorTile);
      }
    }
  }

  // Second pass: Add wall tiles with proper connections
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (map[y][x] === 1) {
        // This is a wall
        const tileX = x * tileSize;
        const tileY = y * tileSize;

        // Use only the WALL tile for all walls
        const wallTileIndex = TILES.WALL.WALL;

        // Create wall tile
        const wall = walls.create(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          "dungeon_wall",
          wallTileIndex
        );
        wall.setScale(2);
        wall.setDepth(2); // Set walls to be above floor and decorations

        // Mark some walls as destructible based on probability
        // Don't make edge walls destructible to prevent escaping the map
        if (x > 1 && y > 1 && x < mapWidth - 2 && y < mapHeight - 2) {
          // Use a custom property that's easier to check
          (wall as any).isDestructible = true;

          // Visual indicator that the wall is destructible (slightly different tint)
          wall.setTint(0xcccccc);
        }

        // Update the physics body size to match the scaled sprite
        if (wall.body) {
          wall.body.setSize(tileSize, tileSize);
          wall.body.setOffset(-7, -7);
        }
      }
    }
  }
}

// Spawn enemies on the map
export function spawnEnemies(
  scene: Phaser.Scene,
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

      // Check if position is a floor tile (value 0 is floor)
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
      // Convert tile coordinates to pixel coordinates
      const pixelX = x * tileSize + tileSize / 2;
      const pixelY = y * tileSize + tileSize / 2;

      // Randomly choose between crab and octopus
      const enemyType = Math.random() < 0.5 ? "enemy_crab" : "enemy_octopus";

      // Create the appropriate enemy type using the factory function
      const enemy = createEnemy(scene, pixelX, pixelY, enemyType);

      // Add the enemy to the group
      enemies.add(enemy);

      // Make sure the enemy is active and visible
      enemy.setActive(true);
      enemy.setVisible(true);
    }
  }
}
