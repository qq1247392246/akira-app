"use client";

import { useState } from "react";
import { SnakeGame } from "@/components/games/snake-game";
import { Game2048 } from "@/components/games/game-2048";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gamepad2, Grid3x3, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type GameType = "snake" | "2048" | "melvor" | null;

const GAMES = [
  {
    id: "snake" as GameType,
    name: "贪吃蛇",
    description: "经典贪吃蛇游戏，使用方向键控制",
    icon: Gamepad2,
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "2048" as GameType,
    name: "2048",
    description: "数字合并益智游戏，挑战高分",
    icon: Grid3x3,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "melvor" as GameType,
    name: "梅尔沃放置",
    description: "轻松的放置类 RPG 游戏",
    icon: ExternalLink,
    color: "from-purple-400 to-indigo-500",
    external: true,
    url: "https://melvoridle.com/",
  },
];

export function PlaygroundPanel() {
  const [activeGame, setActiveGame] = useState<GameType>(null);

  return (
    <div className="space-y-6 pb-10">
      {activeGame === null ? (
        <>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">游戏大厅</h3>
            <p className="text-sm text-white/60">选择一款游戏开始摸鱼</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.map((game) => (
              <Card
                key={game.id}
                className="group relative overflow-hidden border-white/20 bg-white/5 p-6 text-white backdrop-blur-md hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => setActiveGame(game.id)}
              >
                <div className={cn(
                  "absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity",
                  `bg-gradient-to-br ${game.color}`
                )} />

                <div className="relative space-y-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    game.color
                  )}>
                    <game.icon className="h-6 w-6 text-white" />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      {game.name}
                      {game.external && <ExternalLink className="h-4 w-4 text-white/40" />}
                    </h4>
                    <p className="text-sm text-white/60 mt-1">{game.description}</p>
                  </div>

                  <Button
                    size="sm"
                    className={cn(
                      "w-full bg-gradient-to-r text-white border-0 hover:scale-105 transition-transform",
                      game.color
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGame(game.id);
                    }}
                  >
                    {game.external ? "访问游戏" : "开始游戏"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">
              摸鱼小贴士
            </h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                贪吃蛇：使用方向键控制，空格键暂停
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                2048：合并相同数字，挑战 2048 分数
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                梅尔沃放置：轻松的放置类游戏，适合长时间挂机
              </li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {GAMES.find((g) => g.id === activeGame)?.name}
              </h3>
              <p className="text-sm text-white/60">
                {GAMES.find((g) => g.id === activeGame)?.description}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveGame(null)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              返回大厅
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex items-center justify-center min-h-[500px]">
            {activeGame === "snake" && <SnakeGame />}
            {activeGame === "2048" && <Game2048 />}
            {activeGame === "melvor" && (
              <div className="w-full h-[600px] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">正在加载梅尔沃放置...</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open("https://melvoridle.com/", "_blank")}
                    className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                    新窗口打开
                  </Button>
                </div>
                <iframe
                  src="https://melvoridle.com/"
                  className="w-full h-full rounded-lg border border-white/20"
                  title="Melvor Idle"
                  allow="autoplay; fullscreen"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
