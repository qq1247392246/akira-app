"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FriendEntry } from "@/data/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Activity,
  Heart,
  MessageCircle,
  Calendar,
  MapPin,
  Shield,
  Bookmark
} from "lucide-react";

type BasicAuthor = {
  id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  signature?: string | null;
};

type UserHoverCardProps = {
  friend?: FriendEntry;
  author?: BasicAuthor | null;
  children: ReactNode;
  className?: string;
  positionClassName?: string;
};

export function UserHoverCard({ friend, author, children, className, positionClassName }: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleOpen = () => {
    clearTimer();
    setOpen(true);
  };

  const handleClose = () => {
    clearTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const updateHoverState = () => setCanHover(media.matches);

    updateHoverState();
    media.addEventListener("change", updateHoverState);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      media.removeEventListener("change", updateHoverState);
    };
  }, []);

  const displayName = friend?.displayName ?? author?.display_name ?? "神秘访客";
  const alias = friend?.alias;
  const signature =
    friend?.signature ?? author?.signature ?? "还没有留下签名";
  const location = friend?.location ?? "位置待补充";
  const avatarUrl = friend?.avatarUrl ?? author?.avatar_url ?? undefined;
  const badges = friend?.badges?.slice(0, 3) ?? [];
  const tags = friend?.tags?.slice(0, 3) ?? [];
  const stats = friend?.stats;
  const statItems = [
    {
      label: "活跃度",
      value: typeof stats?.activityScore === "number" ? Math.round(stats.activityScore).toString() : "0",
      icon: Activity,
    },
    {
      label: "累计喜欢",
      value: typeof stats?.likes === "number" ? stats.likes.toString() : "0",
      icon: Heart,
    },
    {
      label: "交流次数",
      value: typeof stats?.comments === "number" ? stats.comments.toString() : "0",
      icon: MessageCircle,
    },
    {
      label: "陪伴天数",
      value: typeof stats?.companionshipDays === "number" ? `${stats.companionshipDays}天` : "0天",
      icon: Calendar,
    },
  ];

  const accentClass = friend?.accent
    ? `bg-gradient-to-br ${friend.accent}`
    : "bg-gradient-to-br from-[rgb(var(--accent-rose-rgb)/0.18)] via-[rgb(var(--accent-butter-rgb)/0.12)] to-[rgb(var(--accent-sage-rgb)/0.12)]";
  const neonClass = friend?.neon ?? "shadow-[0_16px_34px_rgb(var(--ink-rgb)/0.12)]";
  const cardPosition = positionClassName ?? "bottom-full left-0 mb-4";

  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        className="inline-flex focus:outline-none"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        tabIndex={0}
      >
        {children}
      </span>
      {canHover && (
        <div
          className={cn(
            "absolute z-50 w-[min(680px,calc(100vw-2rem))] pointer-events-none opacity-0 scale-95 translate-y-2 transition-all duration-200 ease-out",
            cardPosition,
            open && "pointer-events-auto opacity-100 scale-100 translate-y-0"
          )}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <div
            className={cn(
              "paper-texture relative overflow-hidden rounded-[1.8rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.98)] text-foreground",
              neonClass
            )}
          >
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className={cn("absolute inset-0", accentClass)} />
            </div>

          <div className="relative grid min-h-[300px] gap-0 md:grid-cols-[220px_1fr]">
            <div className="relative flex flex-col items-center border-b-2 border-[rgb(var(--ink-rgb)/0.08)] bg-[rgb(var(--paper-soft-rgb)/0.58)] p-5 md:border-b-0 md:border-r-2">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24 rounded-[1.7rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb))] shadow-sm">
                  <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.26)] text-2xl font-medium text-foreground">
                    {displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-[rgb(var(--paper-soft-rgb))] bg-[rgb(var(--accent-coral-rgb)/0.72)] p-1.5 shadow-sm">
                  <Shield className="h-3.5 w-3.5 text-[rgb(var(--paper-soft-rgb))]" />
                </div>
              </div>

              <h3 className="mb-2 text-center text-xl font-semibold leading-tight text-foreground">
                {displayName}
              </h3>

              <div className="mb-3 rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.78)] px-3 py-1">
                <p className="max-w-[160px] truncate text-xs font-medium text-muted-foreground">
                  {alias || (author?.username ? `@${author.username}` : "神秘访客")}
                </p>
              </div>

              <div className="mb-5 flex items-center gap-1.5 text-[rgb(var(--ink-muted-rgb))]">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">{location}</span>
              </div>

              {badges.length > 0 && (
                <div className="w-full space-y-2 mt-auto">
                  {badges.map((badge) => (
                    <div
                      key={`${badge.id ?? badge.label}-badge`}
                      className={cn(
                        "w-full rounded-[0.9rem] border-2 border-[rgb(var(--ink-rgb)/0.08)] py-1.5 text-center text-[10px] font-semibold tracking-wide text-[rgb(var(--ink-rgb))] shadow-sm transition-transform hover:scale-[1.01]",
                        badge.color || "bg-gradient-to-r from-[rgb(var(--accent-butter-rgb)/0.55)] to-[rgb(var(--accent-coral-rgb)/0.28)]"
                      )}
                    >
                      {badge.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 p-5">
              <div className="relative">
                <p className="text-base font-medium leading-relaxed text-foreground">
                  {signature}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex h-20 flex-col justify-between rounded-[1.1rem] border-2 border-[rgb(var(--ink-rgb)/0.08)] bg-[rgb(var(--paper-soft-rgb)/0.72)] p-3"
                  >
                    <div className="flex items-center gap-2 text-[rgb(var(--ink-muted-rgb))]">
                      <item.icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </div>
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink-muted-rgb))]">
                  标签星群
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <div
                        key={`${tag.id}-tag`}
                        className="flex items-center gap-2 rounded-full border-2 border-[rgb(var(--ink-rgb)/0.08)] bg-[rgb(var(--paper-soft-rgb)/0.7)] px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        <span>{tag.label}</span>
                        <div className="flex items-center gap-1 border-l border-[rgb(var(--ink-rgb)/0.1)] pl-1 text-[rgb(var(--ink-muted-rgb))]">
                          <Heart className="h-3 w-3" />
                          <span className="text-[10px]">1</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs italic text-muted-foreground">暂无标签</span>
                  )}
                </div>
              </div>

              <div className="mt-auto border-t-2 border-dashed border-[rgb(var(--ink-rgb)/0.08)] pt-4">
                <div className="flex items-center gap-3 text-[rgb(var(--ink-muted-rgb))]">
                  <Bookmark className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">待补完</span>
                    <span className="text-[10px]">尚未分享故事</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </span>
  );
}
