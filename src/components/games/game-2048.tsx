"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const GRID_SIZE = 4;
const CELL_SIZE = 85;
const GAP = 12;

type Board = number[][];
type Tile = {
  value: number;
  id: string;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
};

const TILE_COLORS: Record<number, string> = {
  2: "bg-gradient-to-br from-cyan-400 to-blue-500",
  4: "bg-gradient-to-br from-blue-500 to-purple-500",
  8: "bg-gradient-to-br from-purple-500 to-pink-500",
  16: "bg-gradient-to-br from-pink-500 to-rose-500",
  32: "bg-gradient-to-br from-rose-500 to-orange-500",
  64: "bg-gradient-to-br from-orange-500 to-amber-500",
  128: "bg-gradient-to-br from-amber-500 to-yellow-400",
  256: "bg-gradient-to-br from-yellow-400 to-lime-400",
  512: "bg-gradient-to-br from-lime-400 to-green-400",
  1024: "bg-gradient-to-br from-green-400 to-emerald-400",
  2048: "bg-gradient-to-br from-emerald-400 to-teal-400",
  4096: "bg-gradient-to-br from-teal-500 to-cyan-600",
};

function createEmptyBoard(): Board {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(0));
}

function boardToTiles(board: Board): Tile[] {
  const tiles: Tile[] = [];
  board.forEach((row, i) => {
    row.forEach((value, j) => {
      if (value !== 0) {
        tiles.push({
          value,
          id: `${i}-${j}-${value}-${Date.now()}-${Math.random()}`,
          row: i,
          col: j,
        });
      }
    });
  });
  return tiles;
}

function addRandomTile(board: Board): Board {
  const emptyCells: [number, number][] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) {
        emptyCells.push([i, j]);
      }
    }
  }

  if (emptyCells.length === 0) return board;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newBoard = board.map((row) => [...row]);
  newBoard[row][col] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initializeBoard(): Board {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

function moveLeft(board: Board): { board: Board; moved: boolean; scoreGained: number } {
  let moved = false;
  let scoreGained = 0;
  const newBoard = board.map((row) => {
    const filtered = row.filter((cell) => cell !== 0);
    const merged: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        scoreGained += filtered[i] * 2;
        i += 2;
        moved = true;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    const result = [...merged, ...Array(GRID_SIZE - merged.length).fill(0)];
    if (JSON.stringify(result) !== JSON.stringify(row)) moved = true;
    return result;
  });
  return { board: newBoard, moved, scoreGained };
}

function rotateBoard(board: Board): Board {
  return board[0].map((_, i) => board.map((row) => row[i]).reverse());
}

function move(board: Board, direction: string): { board: Board; moved: boolean; scoreGained: number } {
  let tempBoard = board;
  let rotations = 0;

  switch (direction) {
    case "up":
      rotations = 3;
      break;
    case "right":
      rotations = 2;
      break;
    case "down":
      rotations = 1;
      break;
    default:
      rotations = 0;
  }

  for (let i = 0; i < rotations; i++) {
    tempBoard = rotateBoard(tempBoard);
  }

  const result = moveLeft(tempBoard);

  for (let i = 0; i < (4 - rotations) % 4; i++) {
    result.board = rotateBoard(result.board);
  }

  return result;
}

function isGameOver(board: Board): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) return false;
      if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return false;
      if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return false;
    }
  }
  return true;
}

export function Game2048() {
  const [board, setBoard] = useState<Board>(initializeBoard);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    setTiles(boardToTiles(board));
  }, [board]);

  const resetGame = useCallback(() => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
  }, []);

  const handleMove = useCallback(
    (direction: string) => {
      if (gameOver) return;

      const { board: newBoard, moved, scoreGained } = move(board, direction);

      if (moved) {
        setBoard(newBoard);
        setScore((prev) => {
          const newScore = prev + scoreGained;
          if (newScore > bestScore) {
            setBestScore(newScore);
          }
          return newScore;
        });

        setTimeout(() => {
          const boardWithNewTile = addRandomTile(newBoard);
          setBoard(boardWithNewTile);

          if (isGameOver(boardWithNewTile)) {
            setGameOver(true);
          }
        }, 150);
      }
    },
    [board, gameOver, bestScore]
  );

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowUp":
          handleMove("up");
          break;
        case "ArrowDown":
          handleMove("down");
          break;
        case "ArrowLeft":
          handleMove("left");
          break;
        case "ArrowRight":
          handleMove("right");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleMove]);

  const containerSize = CELL_SIZE * 4 + GAP * 3;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-md gap-4">
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <p className="text-xs text-cyan-300 font-medium">当前分数</p>
            <p className="text-2xl font-black text-cyan-400">{score}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <p className="text-xs text-amber-300 font-medium">最高分</p>
            <p className="text-2xl font-black text-amber-400">{bestScore}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={resetGame}
          className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <RotateCcw className="h-4 w-4" />
          重新开始
        </Button>
      </div>

      <div className="relative rounded-2xl bg-white/5 border border-white/10 shadow-2xl shadow-cyan-500/10 p-3">
        <div className="relative" style={{ width: containerSize, height: containerSize }}>
          {/* 网格背景 */}
          <div className="absolute inset-0 grid grid-cols-4 gap-3">
            {Array(16).fill(0).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/10 border border-white/5"
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            ))}
          </div>

          {/* 动画方块 */}
          <div className="absolute inset-0">
            {tiles.map((tile) => {
              const posX = tile.col * (CELL_SIZE + GAP);
              const posY = tile.row * (CELL_SIZE + GAP);

              return (
                <div
                  key={tile.id}
                  className={cn(
                    "absolute rounded-xl flex items-center justify-center font-black text-white shadow-lg transition-all duration-150 ease-out",
                    TILE_COLORS[tile.value] ?? "bg-gradient-to-br from-teal-600 to-cyan-600",
                    tile.isNew && "animate-tile-appear",
                    tile.isMerged && "animate-tile-merge",
                    tile.value >= 128 ? "text-3xl" : tile.value >= 1024 ? "text-2xl" : "text-3xl"
                  )}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    left: `${posX}px`,
                    top: `${posY}px`,
                    zIndex: tile.isMerged ? 10 : 1,
                  }}
                >
                  <span className="drop-shadow-lg">{tile.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎮</div>
              <p className="text-3xl font-black text-white drop-shadow-lg">游戏结束!</p>
              <p className="text-lg text-cyan-300 font-medium">最终分数: {score}</p>
              {score > 0 && score === bestScore && (
                <p className="text-sm text-amber-400 animate-pulse">🎉 新纪录!</p>
              )}
              <Button
                onClick={resetGame}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
              >
                再来一局
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 text-xs">↑ ↓ ← →</kbd>
          <span>方向控制</span>
        </div>
        <p className="text-xs text-white/40">
          合并相同数字，挑战 2048！
        </p>
      </div>
    </div>
  );
}
