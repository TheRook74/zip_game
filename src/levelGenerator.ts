import { Level } from './types';

const COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'orange', 'fuchsia'];

export function generateLevel(id: number, size: number): Level {
  const numCheckpoints = 5 + Math.floor(Math.random() * 5); // 5 to 9
  const totalCells = size * size;
  const grid = Array(totalCells).fill(false);
  
  const getCoords = (idx: number) => ({
    x: idx % size,
    y: Math.floor(idx / size)
  });

  const getIdx = (x: number, y: number) => y * size + x;

  const getNeighbors = (idx: number) => {
    const { x, y } = getCoords(idx);
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(getIdx(x - 1, y));
    if (x < size - 1) neighbors.push(getIdx(x + 1, y));
    if (y > 0) neighbors.push(getIdx(x, y - 1));
    if (y < size - 1) neighbors.push(getIdx(x, y + 1));
    return neighbors;
  };

  // Backtracking to find Hamiltonian path
  const findPath = (current: number, path: number[]): number[] | null => {
    if (path.length === totalCells) return path;

    const neighbors = getNeighbors(current)
      .filter(n => !grid[n])
      // Warnsdorff-like heuristic: sort by number of available neighbors
      .sort((a, b) => {
        const countA = getNeighbors(a).filter(n => !grid[n]).length;
        const countB = getNeighbors(b).filter(n => !grid[n]).length;
        return countA - countB;
      });

    for (const neighbor of neighbors) {
      grid[neighbor] = true;
      path.push(neighbor);
      const result = findPath(neighbor, path);
      if (result) return result;
      path.pop();
      grid[neighbor] = false;
    }

    return null;
  };

  // Try different start positions if needed
  let hamiltonianPath: number[] | null = null;
  const startPositions = Array.from({ length: totalCells }, (_, i) => i).sort(() => Math.random() - 0.5);
  
  for (const start of startPositions) {
    grid.fill(false);
    grid[start] = true;
    hamiltonianPath = findPath(start, [start]);
    if (hamiltonianPath) break;
  }

  if (!hamiltonianPath) {
    // Fallback (should theoretically not happen for 6x6)
    throw new Error('Could not generate Hamiltonian path');
  }

  // Assign checkpoints along the path
  const checkpoints: { [key: number]: number } = {};
  
  // Always include start (1) and end (max)
  checkpoints[hamiltonianPath[0]] = 1;
  checkpoints[hamiltonianPath[totalCells - 1]] = numCheckpoints;

  // Pick intermediate checkpoints
  const intermediateCount = numCheckpoints - 2;
  if (intermediateCount > 0) {
    // Distribute checkpoints more evenly along the path
    const pathIndices = new Set<number>();
    while (pathIndices.size < intermediateCount) {
      const idx = 1 + Math.floor(Math.random() * (totalCells - 2));
      pathIndices.add(idx);
    }
    const sortedIndices = Array.from(pathIndices).sort((a, b) => a - b);
    sortedIndices.forEach((pathIdx, i) => {
      checkpoints[hamiltonianPath[pathIdx]] = i + 2;
    });
  }

  // Generate walls
  const walls: string[] = [];
  const pathPairs = new Set<string>();
  for (let i = 0; i < hamiltonianPath.length - 1; i++) {
    const a = hamiltonianPath[i];
    const b = hamiltonianPath[i + 1];
    pathPairs.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
  }

  // Identify all potential wall edges
  const potentialWalls: string[] = [];
  for (let i = 0; i < totalCells; i++) {
    const neighbors = getNeighbors(i);
    for (const n of neighbors) {
      if (i < n) {
        const pair = `${i}-${n}`;
        if (!pathPairs.has(pair)) {
          potentialWalls.push(pair);
        }
      }
    }
  }

  // Create "stepped" walls by picking a few seeds and growing them
  const usedPotential = new Set<string>();
  const numSeeds = 3 + Math.floor(Math.random() * 3);
  
  for (let s = 0; s < numSeeds; s++) {
    if (potentialWalls.length === 0) break;
    
    let currentIdx = Math.floor(Math.random() * potentialWalls.length);
    let currentWall = potentialWalls[currentIdx];
    
    // Grow a wall segment of length 3-6
    const segmentLength = 3 + Math.floor(Math.random() * 4);
    for (let l = 0; l < segmentLength; l++) {
      if (!usedPotential.has(currentWall)) {
        walls.push(currentWall);
        usedPotential.add(currentWall);
      }

      // Find a neighbor edge to continue the "step"
      const [a, b] = currentWall.split('-').map(Number);
      const candidates = potentialWalls.filter(pw => {
        if (usedPotential.has(pw)) return false;
        const [na, nb] = pw.split('-').map(Number);
        // A neighbor edge shares exactly one vertex
        return (na === a || na === b || nb === a || nb === b) && 
               !(na === a && nb === b);
      });

      if (candidates.length === 0) break;
      currentWall = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  return {
    id,
    size,
    checkpoints,
    walls,
    color
  };
}
