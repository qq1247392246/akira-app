"use client";

import { useState } from "react";
import { type PortalUser } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, Menu, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({
  onMenuClick,
  user,
  hasPending,
  isAuthenticated,
  sessionLoading,
  onRequestAuth,
  onLogout,
  canCreateCard,
  onOpenProfile,
}: {
  onMenuClick: () => void;
  user: PortalUser;
  hasPending: boolean;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  onRequestAuth: () => void;
  onLogout: () => void;
  canCreateCard: boolean;
  onOpenProfile: () => void;
}) {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-white/20 bg-white/5 px-6 py-5 backdrop-blur-xl lg:px-10 shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold drop-shadow-sm">personal portal</p>
          <p className="text-xl font-black tracking-wide drop-shadow-md">AKIRA // PRIVATE</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasPending && <Badge className="bg-rose-500 text-[11px] uppercase tracking-wide shadow-md border-none animate-pulse">待审核</Badge>}
        {canCreateCard && (
          <Button className="gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            新建卡片
          </Button>
        )}
        <UserMenu user={user} isAuthenticated={isAuthenticated} sessionLoading={sessionLoading} onRequestAuth={onRequestAuth} onLogout={onLogout} onOpenProfile={onOpenProfile} />
      </div>
    </header>
  );
}

function UserMenu({
  user,
  isAuthenticated,
  sessionLoading,
  onRequestAuth,
  onLogout,
  onOpenProfile,
}: {
  user: PortalUser;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  onRequestAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const roleLabel = user.role === "admin" ? "管理员" : isAuthenticated ? "普通用户" : "访客";
  const handleToggle = () => setOpen((prev) => !prev);
  const handleProfileClick = () => { setOpen(false); onOpenProfile(); };
  const handleAuthClick = () => { setOpen(false); if (isAuthenticated) { onLogout(); } else { onRequestAuth(); } };

  return (
    <div className="relative z-[9999]" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-left text-sm text-white transition hover:border-white/40" onClick={handleToggle}>
        <Avatar className="h-9 w-9 border border-white/30">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight"><span className="text-sm font-medium">{user.displayName}</span><span className="text-xs text-white/50">{roleLabel}</span></div>
      </button>
      <div className={cn("absolute right-0 top-full w-48 pt-2 z-[9999]", "rounded-2xl border border-white/10 bg-[#080c1a]/95 p-2 text-sm text-white shadow-2xl transition-all", open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0")}>
        <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10" onClick={handleProfileClick}>
          <Settings className="h-4 w-4 text-white/60" />
          个人设置
        </button>
        <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10 disabled:opacity-50" onClick={handleAuthClick} disabled={sessionLoading}>
          {isAuthenticated ? (
            <><LogOut className="h-4 w-4 text-white/60" />退出登录</>
          ) : (
            <><LogIn className="h-4 w-4 text-white/60" />登录</>
          )}
        </button>
      </div>
    </div>
  );
}
