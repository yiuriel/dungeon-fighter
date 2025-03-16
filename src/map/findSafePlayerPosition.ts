import { mapWidth, mapHeight, tileSize } from "./mapGenerator";

// Function to find a safe position for the player that's not inside a wall
export function findSafePlayerPosition(map: number[][]): {
  x: number;
  y: number;
} {
  // Start with the center of the map
  let centerX = Math.floor(mapWidth / 2);
  let centerY = Math.floor(mapHeight / 2);

  // Check if the center position is safe (not a wall)
  if (map[centerY][centerX] === 0) {
    return {
      x: centerX * tileSize + tileSize / 2,
      y: centerY * tileSize + tileSize / 2,
    };
  }

  // If center is not safe, spiral outward to find a safe position
  const maxDistance = Math.max(mapWidth, mapHeight);

  for (let distance = 1; distance < maxDistance; distance++) {
    // Check in a square pattern around the center
    for (let offsetY = -distance; offsetY <= distance; offsetY++) {
      for (let offsetX = -distance; offsetX <= distance; offsetX++) {
        // Only check the perimeter of the square
        if (Math.abs(offsetX) === distance || Math.abs(offsetY) === distance) {
          const checkX = centerX + offsetX;
          const checkY = centerY + offsetY;

          // Make sure we're within map bounds
          if (
            checkX > 0 &&
            checkX < mapWidth - 1 &&
            checkY > 0 &&
            checkY < mapHeight - 1
          ) {
            // Check if this position is a floor tile (not a wall)
            if (map[checkY][checkX] === 0) {
              return {
                x: checkX * tileSize + tileSize / 2,
                y: checkY * tileSize + tileSize / 2,
              };
            }
          }
        }
      }
    }
  }

  // Fallback to a default position if no safe position found
  // This should rarely happen with our map generation algorithm
  return {
    x: tileSize * 2,
    y: tileSize * 2,
  };
}
