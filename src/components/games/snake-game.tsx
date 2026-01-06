"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Pause } from "lucide-react";

const GRID_SIZE = 18;
const CELL_SIZE = 26;
const INITIAL_SNAKE = [{ x: 9, y: 9 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 180; // 降低速度，更流畅

type Position = { x: number; y: number };

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 14, y: 9 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [bestScore, setBestScore] = useState(0);
  const [foodPulse, setFoodPulse] = useState(0);

  const generateFood = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood());
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
  }, [generateFood]);

  // 食物脉冲动画
  useEffect(() => {
    const interval = setInterval(() => {
      setFoodPulse((prev) => (prev + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case " ":
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameOver]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const gameLoop = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + direction.x,
          y: head.y + direction.y,
        };

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE ||
          prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
        ) {
          setGameOver(true);
          if (score > bestScore) {
            setBestScore(score);
          }
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        if (newHead.x === food.x && newHead.y === food.y) {
          setFood(generateFood());
          setScore((prev) => prev + 10);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameOver, isPaused, generateFood, score, bestScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布 - 柔和的深蓝色背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制可爱的网格点
    ctx.fillStyle = "#334155";
    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        ctx.beginPath();
        ctx.arc(i * CELL_SIZE, j * CELL_SIZE, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 绘制蛇（超可爱渐变色，圆角）
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      const size = CELL_SIZE - 6;
      const radius = 10;

      if (index === 0) {
        // 蛇头 - 明亮的薄荷绿渐变
        const headGradient = ctx.createRadialGradient(
          x + size / 2 + 3,
          y + size / 2 + 3,
          0,
          x + size / 2 + 3,
          y + size / 2 + 3,
          size / 2
        );
        headGradient.addColorStop(0, "#6ee7b7");
        headGradient.addColorStop(1, "#34d399");
        ctx.fillStyle = headGradient;

        // 绘制圆角矩形（蛇头）
        ctx.beginPath();
        ctx.moveTo(x + 3 + radius, y + 3);
        ctx.lineTo(x + 3 + size - radius, y + 3);
        ctx.quadraticCurveTo(x + 3 + size, y + 3, x + 3 + size, y + 3 + radius);
        ctx.lineTo(x + 3 + size, y + 3 + size - radius);
        ctx.quadraticCurveTo(x + 3 + size, y + 3 + size, x + 3 + size - radius, y + 3 + size);
        ctx.lineTo(x + 3 + radius, y + 3 + size);
        ctx.quadraticCurveTo(x + 3, y + 3 + size, x + 3, y + 3 + size - radius);
        ctx.lineTo(x + 3, y + 3 + radius);
        ctx.quadraticCurveTo(x + 3, y + 3, x + 3 + radius, y + 3);
        ctx.closePath();
        ctx.fill();

        // 添加高光
        const highlightGradient = ctx.createRadialGradient(
          x + 8,
          y + 8,
          0,
          x + 8,
          y + 8,
          10
        );
        highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, 10, 0, Math.PI * 2);
        ctx.fill();

        // 绘制大大的可爱眼睛
        ctx.fillStyle = "#ffffff";
        const eyeSize = 6;
        const eyeOffset = 8;

        if (direction.x === 1) {
          // 向右
          ctx.beginPath();
          ctx.arc(x + size - eyeOffset, y + 8, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - eyeOffset, y + size - 8, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // 瞳孔
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(x + size - eyeOffset + 1, y + 8, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - eyeOffset + 1, y + size - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (direction.x === -1) {
          // 向左
          ctx.beginPath();
          ctx.arc(x + eyeOffset, y + 8, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + eyeOffset, y + size - 8, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // 瞳孔
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(x + eyeOffset - 1, y + 8, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + eyeOffset - 1, y + size - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (direction.y === 1) {
          // 向下
          ctx.beginPath();
          ctx.arc(x + 8, y + size - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - 8, y + size - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // 瞳孔
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(x + 8, y + size - eyeOffset + 1, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - 8, y + size - eyeOffset + 1, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 向上
          ctx.beginPath();
          ctx.arc(x + 8, y + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - 8, y + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // 瞳孔
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(x + 8, y + eyeOffset - 1, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + size - 8, y + eyeOffset - 1, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 可爱的腮红
        ctx.fillStyle = "rgba(251, 113, 133, 0.3)";
        if (direction.x !== 0) {
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size - 6, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x + size - 6, y + size / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 蛇身 - 柔和的渐变，越靠后越透明
        const opacity = Math.max(0.5, 1 - (index / snake.length) * 0.5);
        const bodyGradient = ctx.createRadialGradient(
          x + size / 2 + 3,
          y + size / 2 + 3,
          0,
          x + size / 2 + 3,
          y + size / 2 + 3,
          size / 2
        );
        bodyGradient.addColorStop(0, `rgba(110, 231, 183, ${opacity})`);
        bodyGradient.addColorStop(1, `rgba(52, 211, 153, ${opacity * 0.8})`);
        ctx.fillStyle = bodyGradient;

        ctx.beginPath();
        ctx.moveTo(x + 3 + radius, y + 3);
        ctx.lineTo(x + 3 + size - radius, y + 3);
        ctx.quadraticCurveTo(x + 3 + size, y + 3, x + 3 + size, y + 3 + radius);
        ctx.lineTo(x + 3 + size, y + 3 + size - radius);
        ctx.quadraticCurveTo(x + 3 + size, y + 3 + size, x + 3 + size - radius, y + 3 + size);
        ctx.lineTo(x + 3 + radius, y + 3 + size);
        ctx.quadraticCurveTo(x + 3, y + 3 + size, x + 3, y + 3 + size - radius);
        ctx.lineTo(x + 3, y + 3 + radius);
        ctx.quadraticCurveTo(x + 3, y + 3, x + 3 + radius, y + 3);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 绘制超可爱的食物（爱心 + 脉冲动画）
    const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
    const heartSize = CELL_SIZE / 2.5;
    const pulseScale = 1 + Math.sin(foodPulse) * 0.15;

    ctx.save();
    ctx.translate(foodX, foodY);
    ctx.scale(pulseScale, pulseScale);

    // 爱心发光效果
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#fb7185";

    const heartGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, heartSize * 1.5);
    heartGradient.addColorStop(0, "#fda4af");
    heartGradient.addColorStop(1, "#f43f5e");
    ctx.fillStyle = heartGradient;

    ctx.beginPath();
    ctx.moveTo(0, heartSize / 4);
    ctx.bezierCurveTo(0, -heartSize / 4, -heartSize, -heartSize / 4, -heartSize, heartSize / 4);
    ctx.bezierCurveTo(-heartSize, heartSize / 2, 0, heartSize, 0, heartSize * 1.2);
    ctx.bezierCurveTo(0, heartSize, heartSize, heartSize / 2, heartSize, heartSize / 4);
    ctx.bezierCurveTo(heartSize, -heartSize / 4, 0, -heartSize / 4, 0, heartSize / 4);
    ctx.closePath();
    ctx.fill();

    // 闪光点
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(-heartSize / 3, -heartSize / 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }, [snake, food, direction, foodPulse]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-lg gap-4">
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <p className="text-xs text-emerald-300 font-medium">当前分数</p>
            <p className="text-2xl font-black text-emerald-400">{score}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <p className="text-xs text-amber-300 font-medium">最高分</p>
            <p className="text-2xl font-black text-amber-400">{bestScore}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPaused(!isPaused)}
            disabled={gameOver}
            className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
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
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="border-2 border-emerald-500/30 rounded-2xl bg-slate-900 shadow-2xl shadow-emerald-500/20"
        />
        {(gameOver || isPaused) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4">
              <div className="text-6xl animate-bounce">
                {gameOver ? "😵" : "⏸️"}
              </div>
              <p className="text-3xl font-black text-white drop-shadow-lg">
                {gameOver ? "游戏结束!" : "游戏暂停"}
              </p>
              <p className="text-lg text-emerald-300 font-medium">
                {gameOver ? `最终分数: ${score}` : "按空格键继续"}
              </p>
              {gameOver && score > 0 && score === bestScore && (
                <p className="text-sm text-amber-400 animate-pulse">🎉 新纪录!</p>
              )}
              {gameOver && (
                <Button
                  onClick={resetGame}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                >
                  再来一局
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <div className="flex items-center gap-6 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 text-xs">↑ ↓ ← →</kbd>
            <span>方向控制</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 text-xs">空格</kbd>
            <span>暂停/继续</span>
          </div>
        </div>
        <p className="text-xs text-white/40">
          吃掉跳动的爱心获得分数，小心不要撞墙或咬到自己！
        </p>
      </div>
    </div>
  );
}
