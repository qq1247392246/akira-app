"use client";

import { useMemo } from "react";
import { type PortalCard, type PortalUser } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HEART_COLORS = ["#fb7185", "#f43f5e", "#e11d48"];

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
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHeartParticles(cardId: string, count = 20): HeartParticle[] {
  const rand = createSeededRandom(hashStringToSeed(cardId));
  return Array.from({ length: count }, () => {
    const color = HEART_COLORS[Math.floor(rand() * HEART_COLORS.length)] ?? HEART_COLORS[0];
    return {
      left: 50 + (rand() * 60 - 30),
      fontSize: 12 + rand() * 24,
      color,
      tx: rand() * 200 - 100,
      ty: -(rand() * 150 + 50),
      rotation: rand() * 360,
      scale: 0.8 + rand() * 0.5,
      duration: 1.5 + rand() * 1.8,
      delay: rand() * 0.5,
    };
  });
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
    <div className="flex flex-col gap-8">
      {cards
        .filter((card) => (card.adminOnly ? user.role === "admin" : true))
        .map((card) => {
          const heartParticles = card.id ? heartParticlesMap[card.id] ?? [] : [];
          return (
            <button
              key={card.id}
              id={`card-${card.id}`}
              onClick={() => onSelect(card)}
              className={cn(
                "group relative w-full overflow-hidden rounded-[32px] p-[2px] text-left transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:scale-[1.02] max-md:backdrop-blur-md",
                card.glow
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-white/60 opacity-80 animate-pulse-glow" />
              <div className="absolute inset-[2px] rounded-[30px] bg-white/10 backdrop-blur-xl max-md:backdrop-blur-md border border-white/20 shadow-inner" />
              <div className="relative h-full w-full rounded-[30px] overflow-hidden">
                <div className={cn(
                  "absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-40 blur-[80px] max-md:blur-[60px] mix-blend-screen transition-all duration-700 group-hover:opacity-60 animate-pulse-glow",
                  `bg-gradient-to-br ${card.accent}`
                )} />
                <div className={cn(
                  "absolute -right-20 -bottom-20 h-[400px] w-[400px] rounded-full opacity-30 blur-[60px] max-md:blur-[40px] mix-blend-screen transition-all duration-700 group-hover:opacity-50 animate-pulse-glow",
                  `bg-gradient-to-tl ${card.accent}`
                )} style={{ animationDelay: "1s" }} />
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80" />
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
                {card.id === 'life-journal' && (
                  <>
                    <div className="absolute right-8 bottom-8 opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20 group-hover:drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-rose-500">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {heartParticles.map((particle, i) => (
                        <div key={i} className="absolute text-rose-400 opacity-0 group-hover:animate-float-particle" style={{ left: `${particle.left}%`, bottom: "20%", fontSize: `${particle.fontSize}px`, color: particle.color, "--tx": `${particle.tx}px`, "--ty": `${particle.ty}px`, "--r": `${particle.rotation}deg`, "--s": `${particle.scale}`, "--d": `${particle.duration}s`, animationDelay: `${particle.delay}s` } as React.CSSProperties}>❤️</div>
                      ))}
                    </div>
                  </>
                )}
                {card.id === 'approvals' && (
                  <div className="absolute right-10 bottom-10 opacity-5 transition-all duration-500 group-hover:opacity-15 group-hover:rotate-12 group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"><svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-cyan-500"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg></div>
                )}
                {card.id === 'system-settings' && (
                  <div className="absolute right-10 bottom-10 opacity-5 transition-all duration-700 group-hover:opacity-15 group-hover:rotate-90 group-hover:drop-shadow-[0_0_20px_rgba(148,163,184,0.5)]"><svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-slate-400"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg></div>
                )}
                <div className="relative flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between z-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]", card.id === 'approvals' ? 'text-rose-400 bg-rose-400' : 'text-cyan-300 bg-cyan-300')} />
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70 drop-shadow-sm">{card.type}</p>
                      {card.badge && <Badge variant="outline" className="border-white/30 bg-white/20 text-[10px] uppercase tracking-wider text-white backdrop-blur-md shadow-sm">{card.badge}</Badge>}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-md transition-all group-hover:scale-[1.02] group-hover:text-white">{card.title}</h3>
                      <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-white/80 drop-shadow-sm transition-colors group-hover:text-white">{card.description}</p>
                    </div>
                  </div>
                  {card.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-3 lg:justify-end">
                      {card.metrics.map((metric) => (
                        <div key={metric.label} className="group/metric relative min-w-[160px] overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-5 py-4 transition-all hover:border-white/40 hover:bg-white/20 shadow-sm backdrop-blur-sm">
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold transition-colors group-hover/metric:text-white/80">{metric.label}</p>
                            <p className="mt-1 text-2xl font-bold text-white drop-shadow-md">{metric.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="absolute right-8 top-8 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 lg:static lg:opacity-100 lg:group-hover:translate-x-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/20"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              </div>
            </button>
          );
        })}</div>
  );
}
