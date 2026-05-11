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
  onOpenProfile,
}: {
  onMenuClick: () => void;
  user: PortalUser;
  hasPending: boolean;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  onRequestAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <header className="sticky top-3 z-[300] mx-3 flex items-center justify-between gap-3 rounded-[1.45rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.9)] px-3 py-2.5 shadow-[0_5px_0_rgb(var(--ink-rgb)/0.045),0_14px_26px_rgb(var(--ink-rgb)/0.05)] backdrop-blur-sm sm:top-4 sm:mx-4 sm:rounded-[1.7rem] sm:px-4 lg:mx-6 lg:px-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="打开导航"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="hidden text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--ink-muted-rgb))] sm:block">paper portal</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-foreground sm:text-lg lg:text-xl">Akira 私人入口</p>
            <Sparkles className="hidden h-4 w-4 text-[rgb(var(--accent-coral-rgb))] sm:block" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {hasPending && (
          <Badge className="border-[rgb(var(--accent-coral-rgb)/0.44)] bg-[rgb(var(--accent-coral-rgb)/0.16)] text-[11px] tracking-[0.2em] text-foreground shadow-none">
            待审核
          </Badge>
        )}
        <UserMenu
          user={user}
          isAuthenticated={isAuthenticated}
          sessionLoading={sessionLoading}
          onRequestAuth={onRequestAuth}
          onLogout={onLogout}
          onOpenProfile={onOpenProfile}
        />
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
  const handleProfileClick = () => {
    setOpen(false);
    onOpenProfile();
  };
  const handleAuthClick = () => {
    setOpen(false);
    if (isAuthenticated) {
      onLogout();
    } else {
      onRequestAuth();
    }
  };

  return (
    <div className="relative z-[1000]" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-2 rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.94)] px-2 py-1.5 text-left text-sm text-foreground shadow-[0_3px_0_rgb(var(--ink-rgb)/0.045)] transition hover:-translate-y-px"
        onClick={handleToggle}
      >
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-sm font-medium text-foreground">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-[1000] w-56 pt-3 transition-all",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="rounded-[1.6rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.97)] p-2 shadow-[0_8px_0_rgb(var(--ink-rgb)/0.05),0_18px_30px_rgb(var(--ink-rgb)/0.1)]">
          <button
            className="flex w-full items-center gap-2 rounded-[1.1rem] px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(var(--accent-rose-rgb)/0.14)]"
            onClick={handleProfileClick}
          >
            <Settings className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
            个人设置
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-[1.1rem] px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[rgb(var(--accent-butter-rgb)/0.18)] disabled:opacity-50"
            onClick={handleAuthClick}
            disabled={sessionLoading}
          >
            {isAuthenticated ? (
              <>
                <LogOut className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
                退出登录
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
                登录
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
