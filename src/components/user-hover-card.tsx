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
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
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
    : "bg-gradient-to-br from-violet-600/20 via-fuchsia-500/20 to-purple-500/20";
  const neonClass = friend?.neon ?? "shadow-[0_0_40px_rgba(124,58,237,0.15)]";
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
      <div
        className={cn(
          "absolute z-50 w-[680px] pointer-events-none opacity-0 scale-95 translate-y-2 transition-all duration-200 ease-out",
          cardPosition,
          open && "pointer-events-auto opacity-100 scale-100 translate-y-0"
        )}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f0720]/95 text-white backdrop-blur-2xl shadow-2xl",
            neonClass
          )}
        >
          {/* Background Effects */}
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className={cn("absolute inset-0 blur-[100px]", accentClass)} />
          </div>

          <div className="relative grid grid-cols-[240px_1fr] min-h-[320px]">
            {/* Left Column: Profile Info */}
            <div className="relative flex flex-col items-center p-6 border-r border-white/5 bg-white/[0.02]">
              <div className="relative mb-4">
                <Avatar className="h-28 w-28 border-4 border-white/10 shadow-2xl ring-1 ring-black/20">
                  <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-white/5 text-2xl font-medium text-white/70">
                    {displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-purple-500 p-1.5 shadow-lg ring-4 ring-[#0f0720]">
                  <Shield className="h-3.5 w-3.5 text-white fill-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 text-center leading-tight">
                {displayName}
              </h3>

              <div className="mb-3 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <p className="text-xs font-medium text-white/80 truncate max-w-[160px]">
                  {alias || (author?.username ? `@${author.username}` : "神秘访客")}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-white/40 mb-6">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">{location}</span>
              </div>

              {/* Vertical Badges */}
              {badges.length > 0 && (
                <div className="w-full space-y-2 mt-auto">
                  {badges.map((badge) => (
                    <div
                      key={`${badge.id ?? badge.label}-badge`}
                      className={cn(
                        "w-full text-center py-1.5 rounded-lg text-[10px] font-bold tracking-wide text-white shadow-sm backdrop-blur-sm border border-white/10 transition-transform hover:scale-[1.02]",
                        badge.color || "bg-gradient-to-r from-blue-600 to-cyan-500"
                      )}
                    >
                      {badge.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Content */}
            <div className="flex flex-col p-6 gap-6">
              {/* Signature */}
              <div className="relative">
                <p className="text-lg text-white/90 font-medium leading-relaxed">
                  {signature}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col justify-between p-3 rounded-2xl bg-[#1a1030]/50 border border-white/5 h-20"
                  >
                    <div className="flex items-center gap-2 text-white/40">
                      <item.icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tags Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                  标签星群
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <div
                        key={`${tag.id}-tag`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
                      >
                        <span>{tag.label}</span>
                        <div className="flex items-center gap-1 text-white/30 pl-1 border-l border-white/10">
                          <Heart className="h-3 w-3" />
                          <span className="text-[10px]">1</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-white/20 italic">暂无标签</span>
                  )}
                </div>
              </div>

              {/* Bottom Placeholder */}
              <div className="mt-auto pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-white/30">
                  <Bookmark className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white/50">待补完</span>
                    <span className="text-[10px]">尚未分享故事</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </span>
  );
}
