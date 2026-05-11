"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Gamepad2, Grid3x3, PencilRuler } from "lucide-react";
import { SnakeGame } from "@/components/games/snake-game";
import { Game2048 } from "@/components/games/game-2048";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GameType = "snake" | "2048" | "melvor" | null;

const GAMES = [
  {
    id: "snake" as GameType,
    name: "贪吃蛇",
    description: "经典方向键玩法，适合切换思路时快速放空几分钟。",
    icon: Gamepad2,
    accent: "from-emerald-300/80 via-lime-200/60 to-teal-300/80",
    chip: "rgb(var(--accent-sage-rgb) / 0.28)",
  },
  {
    id: "2048" as GameType,
    name: "2048",
    description: "数字拼块小游戏，慢节奏但很容易上头。",
    icon: Grid3x3,
    accent: "from-[rgb(var(--accent-butter-rgb)/0.8)] via-[rgb(var(--accent-coral-rgb)/0.28)] to-[rgb(var(--accent-rose-rgb)/0.35)]",
    chip: "rgb(var(--accent-butter-rgb) / 0.28)",
  },
  {
    id: "melvor" as GameType,
    name: "Melvor Idle",
    description: "挂机向 RPG，适合挂在一旁慢慢推进。",
    icon: PencilRuler,
    accent: "from-[rgb(var(--accent-rose-rgb)/0.4)] via-[rgb(var(--accent-coral-rgb)/0.26)] to-[rgb(var(--accent-butter-rgb)/0.4)]",
    chip: "rgb(var(--accent-rose-rgb) / 0.26)",
    external: true,
    url: "https://melvoridle.com/",
  },
];

export function PlaygroundPanel() {
  const [activeGame, setActiveGame] = useState<GameType>(null);

  const activeMeta = useMemo(
    () => GAMES.find((game) => game.id === activeGame) ?? null,
    [activeGame]
  );

  if (activeGame === null) {
    return (
      <div className="space-y-6 pb-10">
        <section className="sketch-surface sketch-wash paper-texture space-y-4 p-6 md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="font-display text-xs uppercase tracking-[0.35em] text-[rgb(var(--ink-muted-rgb))]">
                Break Corner
              </p>
              <h3 className="font-display text-3xl text-foreground md:text-4xl">摸鱼角落</h3>
              <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--ink-muted-rgb))]">
                这里保留几个轻量玩法，用来切换注意力、缓一口气，再回到主线任务。
              </p>
            </div>
            <div className="sketch-pill flex items-center gap-2 px-4 py-2 text-xs text-[rgb(var(--ink-muted-rgb))]">
              <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-coral-rgb)/0.7)]" />
              当前收录 {GAMES.length} 个放松项目
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {GAMES.map((game) => (
              <Card
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveGame(game.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveGame(game.id);
                  }
                }}
                className="group sketch-surface relative cursor-pointer overflow-hidden border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.9)] p-5 text-left shadow-[0_10px_0_rgb(var(--ink-rgb)/0.05),0_18px_28px_rgb(var(--ink-rgb)/0.08)] transition duration-300 hover:-translate-y-1"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full blur-3xl opacity-70",
                    "bg-gradient-to-r",
                    game.accent
                  )}
                />
                <div className="relative space-y-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] border-2 border-[rgb(var(--ink-rgb)/0.12)]"
                    style={{ backgroundColor: game.chip }}
                  >
                    <game.icon className="h-6 w-6 text-[rgb(var(--ink-rgb))]" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">{game.name}</h4>
                      {game.external ? (
                        <ExternalLink className="h-4 w-4 text-[rgb(var(--ink-muted-rgb))]" />
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-[rgb(var(--ink-muted-rgb))]">
                      {game.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full px-4"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveGame(game.id);
                    }}
                  >
                    {game.external ? "打开内嵌页" : "开始玩"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="sketch-surface space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--accent-butter-rgb)/0.25)]">
              <PencilRuler className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="font-display text-xl text-foreground">小提示</p>
              <p className="text-sm text-[rgb(var(--ink-muted-rgb))]">
                这些小游戏都保持轻量，不会替换主站结构，只作为可随手打开的休息区。
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="sketch-pill px-4 py-3 text-sm text-[rgb(var(--ink-muted-rgb))]">
              贪吃蛇使用方向键控制，适合短时切换节奏。
            </div>
            <div className="sketch-pill px-4 py-3 text-sm text-[rgb(var(--ink-muted-rgb))]">
              2048 更适合无声操作，移动端也能快速上手。
            </div>
            <div className="sketch-pill px-4 py-3 text-sm text-[rgb(var(--ink-muted-rgb))]">
              Melvor Idle 支持单独新窗口打开，适合长期挂机。
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="sketch-surface sketch-wash paper-texture space-y-5 p-6 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-[rgb(var(--ink-muted-rgb))]">
              Now Playing
            </p>
            <h3 className="font-display text-3xl text-foreground">
              {activeMeta?.name ?? "摸鱼角落"}
            </h3>
            <p className="text-sm leading-6 text-[rgb(var(--ink-muted-rgb))]">
              {activeMeta?.description}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveGame(null)}>
            返回列表
          </Button>
        </div>

        <div className="sketch-surface overflow-hidden border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-4 md:p-5">
          {activeGame === "snake" ? (
            <div className="flex min-h-[520px] items-center justify-center">
              <SnakeGame />
            </div>
          ) : null}
          {activeGame === "2048" ? (
            <div className="flex min-h-[520px] items-center justify-center">
              <Game2048 />
            </div>
          ) : null}
          {activeGame === "melvor" ? (
            <div className="flex min-h-[620px] flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-[1.4rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)] px-4 py-4 text-sm text-[rgb(var(--ink-muted-rgb))] sm:flex-row sm:items-center sm:justify-between">
                <p>内嵌页面可能加载稍慢，必要时可在新窗口中继续。</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open("https://melvoridle.com/", "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                  新窗口打开
                </Button>
              </div>
              <iframe
                src="https://melvoridle.com/"
                className="min-h-[540px] w-full rounded-[1.5rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.95)]"
                title="Melvor Idle"
                allow="autoplay; fullscreen"
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
