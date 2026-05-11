"use client";

import { useMemo } from "react";
import {
  BookHeart,
  Gamepad2,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { type PortalCard, type PortalUser } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HEART_COLORS = ["#ef8f9f", "#f7a977", "#efc768"];

type HeartParticle = {
  left: number;
  fontSize: number;
  color: string;
  tx: number;
  ty: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
};

type CardLook = {
  eyebrow: string;
  stamp: string;
  icon: LucideIcon;
  washClass: string;
  lineClass: string;
  badgeClass: string;
  iconClass: string;
  particle?: boolean;
};

const CARD_LOOKS: Record<string, CardLook> = {
  "life-journal": {
    eyebrow: "记录",
    stamp: "01",
    icon: BookHeart,
    washClass: "from-[#f7cad7] via-[#fde0a8] to-[#fff6eb]",
    lineClass: "bg-[rgb(var(--accent-rose-rgb)/0.7)]",
    badgeClass: "bg-[rgb(var(--accent-rose-rgb)/0.24)]",
    iconClass: "bg-[rgb(var(--accent-rose-rgb)/0.34)]",
    particle: true,
  },
  friends: {
    eyebrow: "朋友",
    stamp: "02",
    icon: UsersRound,
    washClass: "from-[#f7d2c3] via-[#f6e3b4] to-[#fff6ec]",
    lineClass: "bg-[rgb(var(--accent-coral-rgb)/0.62)]",
    badgeClass: "bg-[rgb(var(--accent-coral-rgb)/0.18)]",
    iconClass: "bg-[rgb(var(--accent-butter-rgb)/0.28)]",
  },
  playground: {
    eyebrow: "摸鱼",
    stamp: "03",
    icon: Gamepad2,
    washClass: "from-[#dbeac1] via-[#f6e6b5] to-[#fff7ed]",
    lineClass: "bg-[rgb(var(--accent-sage-rgb)/0.78)]",
    badgeClass: "bg-[rgb(var(--accent-sage-rgb)/0.24)]",
    iconClass: "bg-[rgb(var(--accent-sage-rgb)/0.28)]",
  },
  approvals: {
    eyebrow: "审核",
    stamp: "04",
    icon: ShieldCheck,
    washClass: "from-[#f9d3cb] via-[#fde4c4] to-[#fff8ef]",
    lineClass: "bg-[rgb(var(--accent-coral-rgb)/0.7)]",
    badgeClass: "bg-[rgb(var(--accent-coral-rgb)/0.2)]",
    iconClass: "bg-[rgb(var(--accent-coral-rgb)/0.24)]",
  },
  "system-settings": {
    eyebrow: "设置",
    stamp: "05",
    icon: Settings2,
    washClass: "from-[#f2ddcd] via-[#f4e9d7] to-[#fffaf4]",
    lineClass: "bg-[rgb(var(--ink-rgb)/0.24)]",
    badgeClass: "bg-[rgb(var(--ink-rgb)/0.08)]",
    iconClass: "bg-[rgb(var(--ink-rgb)/0.08)]",
  },
  stack: {
    eyebrow: "实验",
    stamp: "06",
    icon: Sparkles,
    washClass: "from-[#f0d9ee] via-[#f7e9c8] to-[#fff7ee]",
    lineClass: "bg-[rgb(var(--accent-rose-rgb)/0.56)]",
    badgeClass: "bg-[rgb(var(--accent-rose-rgb)/0.18)]",
    iconClass: "bg-[rgb(var(--accent-butter-rgb)/0.22)]",
  },
};

function hashStringToSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function createSeededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHeartParticles(cardId: string, count = 12): HeartParticle[] {
  const rand = createSeededRandom(hashStringToSeed(cardId));
  return Array.from({ length: count }, () => {
    const color = HEART_COLORS[Math.floor(rand() * HEART_COLORS.length)] ?? HEART_COLORS[0];
    return {
      left: 50 + (rand() * 42 - 21),
      fontSize: 12 + rand() * 14,
      color,
      tx: rand() * 120 - 60,
      ty: -(rand() * 100 + 34),
      rotation: rand() * 240,
      scale: 0.85 + rand() * 0.4,
      duration: 1.4 + rand() * 1.2,
      delay: rand() * 0.45,
    };
  });
}

function getCardLook(cardId: string): CardLook {
  return (
    CARD_LOOKS[cardId] ?? {
      eyebrow: "模块",
      stamp: "00",
      icon: Sparkles,
      washClass: "from-[#f7e2d0] via-[#f9ecc7] to-[#fff8ef]",
      lineClass: "bg-[rgb(var(--accent-butter-rgb)/0.62)]",
      badgeClass: "bg-[rgb(var(--accent-butter-rgb)/0.18)]",
      iconClass: "bg-[rgb(var(--accent-butter-rgb)/0.24)]",
    }
  );
}

export function CardGrid({
  cards,
  onSelect,
  user,
}: {
  cards: PortalCard[];
  onSelect: (card: PortalCard) => void;
  user: PortalUser;
}) {
  const heartParticlesMap = useMemo(() => {
    const map: Record<string, HeartParticle[]> = {};
    cards.forEach((card) => {
      if (card.id) {
        map[card.id] = generateHeartParticles(card.id);
      }
    });
    return map;
  }, [cards]);

  return (
    <div className="flex flex-col gap-5">
      {cards
        .filter((card) => (card.adminOnly ? user.role === "admin" : true))
        .map((card, index) => {
          const look = getCardLook(card.id);
          const Icon = look.icon;
          const heartParticles = card.id ? heartParticlesMap[card.id] ?? [] : [];

          return (
            <button
              key={card.id}
              id={`card-${card.id}`}
              onClick={() => onSelect(card)}
              className="group relative w-full text-left transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div
                className="sketch-card relative min-h-[13rem] overflow-hidden bg-[rgb(var(--paper-soft-rgb)/0.88)] px-4 py-5 transition group-hover:border-[rgb(var(--ink-rgb)/0.2)] sm:px-5 sm:py-6 lg:px-6"
                style={{ transform: `rotate(${index % 3 === 0 ? "-0.18deg" : index % 3 === 1 ? "0.16deg" : "-0.08deg"})` }}
              >
                <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1.5", look.lineClass)} />
                <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-38", look.washClass)} />
                <div className="pointer-events-none absolute -right-1 top-4 rotate-3 rounded-full border border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.58)] px-3 py-1 text-[10px] tracking-[0.2em] text-[rgb(var(--ink-muted-rgb))] sm:right-4">
                  {look.stamp}
                </div>

                {look.particle && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {heartParticles.map((particle, particleIndex) => (
                      <div
                        key={particleIndex}
                        className="absolute opacity-0 group-hover:animate-float-particle"
                        style={{
                          left: `${particle.left}%`,
                          bottom: "24%",
                          fontSize: `${particle.fontSize}px`,
                          color: particle.color,
                          ["--tx" as string]: `${particle.tx}px`,
                          ["--ty" as string]: `${particle.ty}px`,
                          ["--r" as string]: `${particle.rotation}deg`,
                          ["--s" as string]: `${particle.scale}`,
                          ["--d" as string]: `${particle.duration}s`,
                          animationDelay: `${particle.delay}s`,
                        }}
                      >
                        ♡
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative z-10 flex h-full flex-col gap-5">
                  <div className="space-y-4 pr-8 sm:pr-14">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn("rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] px-3 py-1 text-[11px] tracking-[0.18em] text-foreground", look.badgeClass)}>
                        {look.eyebrow}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-[rgb(var(--ink-muted-rgb))]">{card.type}</span>
                      {card.badge && <Badge variant="outline">{card.badge}</Badge>}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">{card.title}</h3>
                      <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    {card.metrics.length > 0 && (
                      <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {card.metrics.map((metric, metricIndex) => (
                          <div
                            key={metric.label}
                            className="rounded-[1.05rem] border-2 border-[rgb(var(--ink-rgb)/0.08)] bg-[rgb(var(--paper-soft-rgb)/0.66)] px-3 py-2.5 shadow-none"
                            style={{
                              transform: `rotate(${metricIndex % 2 === 0 ? "-0.12deg" : "0.12deg"})`,
                            }}
                          >
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--ink-muted-rgb))]">{metric.label}</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="hidden h-14 w-14 shrink-0 rotate-[-2deg] items-center justify-center rounded-[38%_62%_44%_56%/48%_42%_58%_52%] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)] shadow-[0_3px_0_rgb(var(--ink-rgb)/0.035)] md:flex">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-[0.9rem] text-foreground", look.iconClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-5 flex flex-col gap-3 border-t-2 border-dashed border-[rgb(var(--ink-rgb)/0.08)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm leading-6 text-muted-foreground">展开详细内容与管理面板</span>
                  <span className="w-fit rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.86)] px-3 py-1 text-sm text-foreground shadow-none transition-transform group-hover:translate-x-1">
                    查看 →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
    </div>
  );
}
