import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, RotateCcw, Trophy, Play, Info, ChevronRight, RefreshCw } from 'lucide-react';
import { GameStatus, Level } from './types';
import { generateLevel } from './levelGenerator';

const COLOR_MAP: Record<string, { bg: string, ring: string, text: string, shadow: string, border: string }> = {
  indigo: { bg: 'bg-indigo-600', ring: 'ring-indigo-700', text: 'text-indigo-600', shadow: 'shadow-indigo-200', border: 'border-indigo-200' },
  emerald: { bg: 'bg-emerald-600', ring: 'ring-emerald-700', text: 'text-emerald-600', shadow: 'shadow-emerald-200', border: 'border-emerald-200' },
  rose: { bg: 'bg-rose-600', ring: 'ring-rose-700', text: 'text-rose-600', shadow: 'shadow-rose-200', border: 'border-rose-200' },
  amber: { bg: 'bg-amber-600', ring: 'ring-amber-700', text: 'text-amber-600', shadow: 'shadow-amber-200', border: 'border-amber-200' },
  violet: { bg: 'bg-violet-600', ring: 'ring-violet-700', text: 'text-violet-600', shadow: 'shadow-violet-200', border: 'border-violet-200' },
  cyan: { bg: 'bg-cyan-600', ring: 'ring-cyan-700', text: 'text-cyan-600', shadow: 'shadow-cyan-200', border: 'border-cyan-200' },
  orange: { bg: 'bg-orange-600', ring: 'ring-orange-700', text: 'text-orange-600', shadow: 'shadow-orange-200', border: 'border-orange-200' },
  fuchsia: { bg: 'bg-fuchsia-600', ring: 'ring-fuchsia-700', text: 'text-fuchsia-600', shadow: 'shadow-fuchsia-200', border: 'border-fuchsia-200' },
};

export default function App() {
  const [level, setLevel] = useState<Level>(() => generateLevel(1, 6));
  const [path, setPath] = useState<number[]>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [time, setTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const size = level.size;
  const totalCells = size * size;
  const theme = COLOR_MAP[level.color] || COLOR_MAP.indigo;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetGame = useCallback(() => {
    setPath([]);
    setStatus('idle');
    setTime(0);
    stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const getCoords = (index: number) => ({
    x: index % size,
    y: Math.floor(index / size)
  });

  const areAdjacent = (idx1: number, idx2: number) => {
    const c1 = getCoords(idx1);
    const c2 = getCoords(idx2);
    return Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y) === 1;
  };

  const handleCellInteraction = (index: number) => {
    if (status === 'won') return;

    if (path.length === 0) {
      // Must start at checkpoint 1
      if (level.checkpoints[index] === 1) {
        setPath([index]);
        setStatus('playing');
        startTimer();
      }
      return;
    }

    const lastIndex = path[path.length - 1];
    
    // If clicking the last cell, do nothing
    if (lastIndex === index) return;

    // If clicking the second to last cell, undo last move
    if (path.length > 1 && path[path.length - 2] === index) {
      setPath(path.slice(0, -1));
      return;
    }

    // Check if adjacent and not already in path
    if (areAdjacent(lastIndex, index) && !path.includes(index)) {
      // Check wall constraint
      const wallKey = `${Math.min(lastIndex, index)}-${Math.max(lastIndex, index)}`;
      if (level.walls.includes(wallKey)) {
        return;
      }

      // Check checkpoint constraint
      const checkpointValue = level.checkpoints[index];
      const allCheckpoints = Object.values(level.checkpoints) as number[];
      const maxCheckpoint = Math.max(...allCheckpoints);

      if (checkpointValue) {
        // Find the highest checkpoint value reached so far
        const reachedCheckpoints = path
          .map(idx => level.checkpoints[idx])
          .filter(val => val !== undefined) as number[];
        const nextExpected = Math.max(0, ...reachedCheckpoints) + 1;
        
        if (checkpointValue !== nextExpected) {
          // Cannot visit this checkpoint yet
          return;
        }

        // NEW: If it's the maximum checkpoint, it MUST be the very last cell of the path
        if (checkpointValue === maxCheckpoint && path.length + 1 !== totalCells) {
          return;
        }
      }

      const newPath = [...path, index];
      setPath(newPath);

      // Check win condition
      if (newPath.length === totalCells) {
        // The last cell MUST be the max checkpoint
        if (level.checkpoints[index] === maxCheckpoint) {
          setStatus('won');
          stopTimer();
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextLevel = () => {
    setLevel(generateLevel(level.id + 1, 6));
    resetGame();
  };

  const generateNew = () => {
    setLevel(generateLevel(level.id, 6));
    resetGame();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className={`w-10 h-10 ${theme.bg} rounded-xl flex items-center justify-center text-white shadow-lg ${theme.shadow}`}>
              <Play size={24} fill="currentColor" />
            </div>
            Zip Puzzle
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Connect all cells in a single path</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <Timer size={18} className={theme.text} />
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatTime(time)}
            </span>
          </div>
          <button
            onClick={resetGame}
            className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl shadow-sm border border-slate-200 transition-all active:scale-95"
            title="Reset Level"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Game Board */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div 
            className="relative bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 select-none touch-none"
            onMouseLeave={() => setIsDragging(false)}
            onMouseUp={() => setIsDragging(false)}
          >
            <div 
              className="grid gap-1"
              style={{ 
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
                width: 'min(85vw, 500px)',
                height: 'min(85vw, 500px)'
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => {
                const isCheckpoint = level.checkpoints[i] !== undefined;
                const checkpointVal = level.checkpoints[i];
                const isInPath = path.includes(i);
                const isLast = path[path.length - 1] === i;
                const isFirst = path[0] === i;

                return (
                  <div
                    key={i}
                    onMouseDown={() => {
                      setIsDragging(true);
                      handleCellInteraction(i);
                    }}
                    onMouseEnter={() => {
                      if (isDragging) handleCellInteraction(i);
                    }}
                    onTouchStart={(e) => {
                      setIsDragging(true);
                      handleCellInteraction(i);
                    }}
                    onTouchMove={(e) => {
                      if (isDragging) {
                        const touch = e.touches[0];
                        const element = document.elementFromPoint(touch.clientX, touch.clientY);
                        const cell = element?.closest('[data-index]');
                        const index = cell?.getAttribute('data-index');
                        if (index !== null && index !== undefined) {
                          handleCellInteraction(parseInt(index));
                        }
                      }
                    }}
                    data-index={i}
                    className={`
                      relative rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 aspect-square
                      ${isCheckpoint ? `${theme.bg} ring-2 ${theme.ring} z-10` : ''}
                      ${isInPath && !isCheckpoint ? `${theme.bg} opacity-80` : ''}
                      ${!isInPath && !isCheckpoint ? 'bg-slate-50 hover:bg-slate-100' : ''}
                      ${isLast ? `ring-4 ${theme.ring.replace('ring-', 'ring-offset-2 ring-')} shadow-xl z-20 scale-105` : ''}
                    `}
                  >
                    {/* Cell Content */}
                    <div className={`
                      w-full h-full flex items-center justify-center font-black text-xl
                      ${isCheckpoint ? 'text-black' : 'text-white'}
                    `}>
                      {isCheckpoint ? checkpointVal : ''}
                    </div>

                    {/* Path Dot (only for last) */}
                    {isLast && (
                      <motion.div
                        layoutId="active-dot"
                        className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* SVG Overlay for Path Lines */}
            <svg 
              className="absolute inset-4 pointer-events-none" 
              style={{ 
                width: 'calc(100% - 2rem)', 
                height: 'calc(100% - 2rem)' 
              }}
            >
              {/* Render Walls */}
              {level.walls.map((wall) => {
                const [idx1, idx2] = wall.split('-').map(Number);
                const p1 = getCoords(idx1);
                const p2 = getCoords(idx2);
                const cellW = 100 / size;
                const cellH = 100 / size;

                // Wall is between p1 and p2. 
                // If p1.x === p2.x, it's a horizontal wall between rows
                // If p1.y === p2.y, it's a vertical wall between columns
                const isHorizontal = p1.x === p2.x;
                
                let x1, y1, x2, y2;
                if (isHorizontal) {
                  // Wall between p1 and p2 (vertical neighbors)
                  const midY = (Math.max(p1.y, p2.y)) * cellH;
                  x1 = p1.x * cellW;
                  y1 = midY;
                  x2 = (p1.x + 1) * cellW;
                  y2 = midY;
                } else {
                  // Wall between p1 and p2 (horizontal neighbors)
                  const midX = (Math.max(p1.x, p2.x)) * cellW;
                  x1 = midX;
                  y1 = p1.y * cellH;
                  x2 = midX;
                  y2 = (p1.y + 1) * cellH;
                }

                return (
                  <line
                    key={`wall-${wall}`}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke="#000000"
                    strokeWidth="6"
                    strokeLinecap="square"
                  />
                );
              })}

              {path.map((idx, i) => {
                if (i === 0) return null;
                const prevIdx = path[i - 1];
                const p1 = getCoords(prevIdx);
                const p2 = getCoords(idx);
                
                const cellW = 100 / size;
                const cellH = 100 / size;
                
                return (
                  <motion.line
                    key={`${prevIdx}-${idx}`}
                    x1={`${p1.x * cellW + cellW/2}%`}
                    y1={`${p1.y * cellH + cellH/2}%`}
                    x2={`${p2.x * cellW + cellW/2}%`}
                    y2={`${p2.y * cellH + cellH/2}%`}
                    stroke="#000000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.3 }}
                  />
                );
              })}
            </svg>
          </div>

          <div className="mt-8 flex items-center gap-6">
            <button
              onClick={generateNew}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              title="Generate New Level"
            >
              <RefreshCw size={24} />
            </button>
            <span className="font-semibold text-slate-500 uppercase tracking-widest text-sm">
              Puzzle #{level.id}
            </span>
            <button
              onClick={nextLevel}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              title="Next Level"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Instructions & Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className={`flex items-center gap-2 ${theme.text} mb-4`}>
              <Info size={20} />
              <h2 className="font-bold uppercase tracking-wider text-sm">How to Play</h2>
            </div>
            <ul className="space-y-4 text-slate-600 text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className={`flex-shrink-0 w-5 h-5 ${theme.bg.replace('-600', '-50')} ${theme.text} rounded-full flex items-center justify-center font-bold text-[10px]`}>1</span>
                Start at number 1 and drag to create a path.
              </li>
              <li className="flex gap-3">
                <span className={`flex-shrink-0 w-5 h-5 ${theme.bg.replace('-600', '-50')} ${theme.text} rounded-full flex items-center justify-center font-bold text-[10px]`}>2</span>
                You must visit every single cell exactly once.
              </li>
              <li className="flex gap-3">
                <span className={`flex-shrink-0 w-5 h-5 ${theme.bg.replace('-600', '-50')} ${theme.text} rounded-full flex items-center justify-center font-bold text-[10px]`}>3</span>
                Pass through the numbered checkpoints in sequence (1, 2, 3...).
              </li>
              <li className="flex gap-3">
                <span className={`flex-shrink-0 w-5 h-5 ${theme.bg.replace('-600', '-50')} ${theme.text} rounded-full flex items-center justify-center font-bold text-[10px]`}>4</span>
                Move only up, down, left, or right. No diagonals!
              </li>
            </ul>
          </div>

          <div className={`${theme.bg} p-6 rounded-3xl shadow-lg ${theme.shadow} text-white`}>
            <h3 className="font-bold text-lg mb-2">Random Challenge</h3>
            <p className="text-white/80 text-sm mb-4">Every puzzle is unique! Can you solve this 6x6 grid in under 30 seconds?</p>
            <div className="flex items-center justify-between bg-white/20 p-3 rounded-xl border border-white/20">
              <span className="text-xs font-medium uppercase tracking-wider">Best Time</span>
              <span className="font-mono font-bold">0:18</span>
            </div>
          </div>
        </div>
      </main>

      {/* Win Modal */}
      <AnimatePresence>
        {status === 'won' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Puzzle Solved!</h2>
              <p className="text-slate-500 mb-8">You zipped through the grid in <span className="text-indigo-600 font-bold">{formatTime(time)}</span></p>
              
              <div className="space-y-3">
                <button
                  onClick={nextLevel}
                  className={`w-full py-4 ${theme.bg} hover:opacity-90 text-white rounded-2xl font-bold shadow-lg ${theme.shadow} transition-all active:scale-95 flex items-center justify-center gap-2`}
                >
                  Next Level
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={resetGame}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
