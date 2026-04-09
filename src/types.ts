export interface Point {
  x: number;
  y: number;
}

export interface Level {
  id: number;
  size: number;
  checkpoints: { [key: number]: number }; // index -> number
  walls: string[]; // "idx1-idx2" where idx1 < idx2
  color: string;
}

export type GameStatus = 'idle' | 'playing' | 'won';
