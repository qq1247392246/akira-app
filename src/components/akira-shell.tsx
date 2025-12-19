"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  cardInsights,
  navSections,
  portalCards,
  portalUser,
  type CardInsight,
  type NavItem,
  type PortalCard,
  type PortalUser,
} from "@/data/mock";
import { type FriendEntry } from "@/data/friends";
import { fetchCards, fetchFriends } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LogIn, LogOut, Menu, Settings, Sparkles, X } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { AuthSheet } from "@/components/auth-sheet";
import { JournalFeed } from "@/components/journal-feed";
import { ApprovalsPanel } from "@/components/approvals-panel";
import { SystemSettingsPanel } from "@/components/system-settings-panel";
import { ProfileSheet } from "@/components/profile-sheet";
import { fetchApprovals } from "@/lib/api";
import { FriendsPanel } from "@/components/friends-panel";

const ADMIN_CARD_IDS = new Set(["approvals", "system-settings"]);
const guestPortalUser: PortalUser = {
  username: "visitor",
  displayName: "访客模式",
  role: "user",
  avatarUrl: "",
  signature: "登录后即可解锁个性化数据与操作。",
  metricSummary: {
    entries: 0,
    uptime: "--",
    invites: 0,
  },
  tags: [],
};

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

export function AkiraShell({
  cards: initialCards = portalCards,
  user = portalUser,
}: {
  cards?: PortalCard[];
  user?: PortalUser;
}) {
  // 注入自定义动画样式
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes float-particle {
        0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(var(--s)) rotate(var(--r)); opacity: 0; }
      }
      .animate-float-particle {
        animation: float-particle var(--d) cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.4; transform: scale(1); filter: brightness(1); }
        50% { opacity: 0.8; transform: scale(1.05); filter: brightness(1.3); }
      }
      @keyframes gradient-flow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      /* 自定义滚动条 - 柔和化处理 */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 9999px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [cards, setCards] = useState<PortalCard[]>(initialCards);
  const [selfFriend, setSelfFriend] = useState<FriendEntry | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<PortalCard | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user: sessionUser, setUser: setSessionUser, loading: sessionLoading } = useSession();
  const canManageCards = sessionUser?.role === 1;

  const refreshApprovalsBadge = useCallback(async (currentCards: PortalCard[]) => {
    if (sessionUser?.role !== 1) return currentCards; // 仅管理员检查

    try {
      const pending = await fetchApprovals({ status: "pending" });
      const count = pending.length;

      return currentCards.map(card => {
        if (card.id === "approvals") {
          return {
            ...card,
            badge: count > 0 ? `${count} Pending` : "",
          };
        }
        return card;
      });
    } catch (error) {
      console.error("Failed to fetch approval count:", error);
      return currentCards;
    }
  }, [sessionUser]);

  const refreshCards = useCallback(async () => {
    try {
      setCardsError(null);
      let fetchedCards = await fetchCards();

      // 智能合并：保留 Mock 数据中的丰富视觉元素和指标，防止 API 数据缺失导致 UI 塌陷
      fetchedCards = fetchedCards.map(fetchedCard => {
        const mockCard = initialCards.find(c => c.id === fetchedCard.id);
        if (!mockCard) return fetchedCard;

        return {
          ...fetchedCard,
          // 如果 API 没有返回指标数据，回退使用 Mock 数据
          metrics: (fetchedCard.metrics && fetchedCard.metrics.length > 0)
            ? fetchedCard.metrics
            : mockCard.metrics,
          // 保持视觉风格一致
          glow: fetchedCard.glow || mockCard.glow,
          accent: fetchedCard.accent || mockCard.accent,
          type: fetchedCard.type || mockCard.type,
          // 如果 API 描述为空，使用 Mock 描述
          description: fetchedCard.description || mockCard.description,
          adminOnly: fetchedCard.adminOnly ?? mockCard.adminOnly,
        };
      });

      if (sessionUser?.role === 1) {
        fetchedCards = await refreshApprovalsBadge(fetchedCards);
      }
      setCards(fetchedCards);
    } catch (error) {
      console.error("Failed to fetch cards:", error);
      setCardsError("获取卡片失败，请稍后再试。");
      setCards(initialCards);
    }
  }, [sessionUser, refreshApprovalsBadge, initialCards]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  useEffect(() => {
    let cancelled = false;
    const loadSelfFriend = async () => {
      if (!sessionUser?.id) {
        setSelfFriend(null);
        return;
      }
      try {
        const items = await fetchFriends({ viewerId: sessionUser.id });
        if (cancelled) return;
        const mine = items.find((entry) => entry.id === sessionUser.id) ?? null;
        setSelfFriend(mine);
      } catch (error) {
        console.error("Failed to load viewer card", error);
        if (!cancelled) {
          setSelfFriend(null);
        }
      }
    };
    loadSelfFriend();
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  const handleApprovalsUpdate = useCallback(async () => {
    if (sessionUser?.role !== 1) return;

    try {
      const pending = await fetchApprovals({ status: "pending" });
      const count = pending.length;

      setCards(prev => prev.map(card => {
        if (card.id === "approvals") {
          return {
            ...card,
            badge: count > 0 ? `${count} Pending` : "",
          };
        }
        return card;
      }));
    } catch (error) {
      console.error("Failed to update approvals badge:", error);
    }
  }, [sessionUser]);

  const pendingBadge = cards.find((card) => card.id === "approvals")?.badge ?? "";
  const hasPending = pendingBadge.toLowerCase().includes("pending");

  const resolvedUser = useMemo<PortalUser>(() => {
    if (!sessionUser) {
      return guestPortalUser;
    }
    const friendTags =
      selfFriend?.tags?.map((tag) => ({ label: tag.label, likes: tag.likes })) ?? user.tags;
    return {
      ...user,
      username: sessionUser.username,
      displayName: sessionUser.displayName,
      role: sessionUser.role === 1 ? "admin" : "user",
      avatarUrl: sessionUser.avatarUrl ?? selfFriend?.avatarUrl ?? user.avatarUrl,
      signature: selfFriend?.signature ?? sessionUser.signature ?? user.signature,
      tags: friendTags,
    };
  }, [sessionUser, selfFriend, user]);

  const handleCardClick = useCallback(
    (card: PortalCard) => {
      if (card.adminOnly && resolvedUser.role !== "admin") {
        return;
      }
      setActiveCard(card);
      setPanelOpen(true);
    },
    [resolvedUser.role]
  );

  const handleNavigate = useCallback((item: NavItem) => {
    setMobileSidebarOpen(false);
    setPanelOpen(false);
    if (!item.targetCard) return;
    const element = document.getElementById(`card-${item.targetCard}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.warn("退出登录失败", error);
    } finally {
      setSessionUser(null);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("akira_session");
        } catch (error) {
          console.warn("清理本地 session 失败", error);
        }
        window.location.href = "/";
      }
    }
  }, [setSessionUser]);

  const activeInsight: CardInsight | undefined = activeCard
    ? cardInsights[activeCard.id]
    : undefined;
  const visibleCards = useMemo(() => {
    if (resolvedUser.role === "admin") return cards;
    return cards.filter(
      (card) => !card.adminOnly && !ADMIN_CARD_IDS.has(card.id ?? "")
    );
  }, [cards, resolvedUser.role]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-900 text-white selection:bg-pink-500/30"
      suppressHydrationWarning
    >
      <AnimatedBackground />
      <div className="relative z-10 flex h-screen">
        <Sidebar
          user={resolvedUser}
          isAuthenticated={Boolean(sessionUser)}
          hasPending={hasPending}
          onNavigate={handleNavigate}
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
        />
        <div className="flex flex-1 flex-col">
          <TopBar
            onMenuClick={() => setMobileSidebarOpen(true)}
            user={resolvedUser}
            hasPending={hasPending}
            isAuthenticated={Boolean(sessionUser)}
            sessionLoading={sessionLoading}
            onRequestAuth={() => setAuthOpen(true)}
            onLogout={handleLogout}
            canCreateCard={Boolean(canManageCards)}
            onOpenProfile={() => setProfileOpen(true)}
          />
          <main className="relative flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-12 px-4 pb-40 pt-6 sm:px-8 lg:px-12">
                <Hero user={resolvedUser} friend={selfFriend} />
                {cardsError && (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-rose-100 shadow-lg">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm">{cardsError}</span>
                      <Button
                        size="sm"
                        className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={refreshCards}
                      >
                        重试
                      </Button>
                    </div>
                  </div>
                )}
                <CardGrid cards={visibleCards} onSelect={handleCardClick} user={resolvedUser} />
              </div>
            </ScrollArea>
            <SlidingPanel
              activeCard={activeCard}
              insight={activeInsight}
              open={panelOpen}
              onClose={() => setPanelOpen(false)}
              onApprovalsUpdate={handleApprovalsUpdate}
              onCardsUpdate={refreshCards}
            />
          </main>
        </div>
      </div>
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={resolvedUser}
        isAuthenticated={Boolean(sessionUser)}
        sessionLoading={sessionLoading}
        onRequestAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />
      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

function AnimatedBackground() {
  const [particleStyles, setParticleStyles] = useState<Array<React.CSSProperties>>([]);

  useEffect(() => {
    const styles = [...Array(25)].map(() => {
      const width = Math.random() * 4 + 2;
      const height = Math.random() * 4 + 2;
      const blur = Math.random() * 10 + 5;

      return {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${width}px`,
        height: `${height}px`,
        "--tx": `${Math.random() * 200 - 100}px`,
        "--ty": `-${Math.random() * 200 + 50}px`,
        "--r": `${Math.random() * 360}deg`,
        "--s": `${Math.random() * 0.5 + 0.5}`,
        "--d": `${Math.random() * 10 + 10}s`,
        boxShadow: `0 0 ${blur}px rgba(255,255,255,0.8)`,
      } as React.CSSProperties;
    });
    setParticleStyles(styles);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1a1b26]">
      {/* 1. 动漫风渐变基底 - 梦幻晚霞/新海诚风格 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-flow bg-[length:400%_400%] opacity-80" />

      {/* 叠加一层暖色滤镜，增加温馨感 */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-300/30 via-transparent to-blue-400/30 mix-blend-overlay" />

      {/* 2. 柔和网格 - 减弱科技感，增加装饰感 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* 3. 梦幻光斑 - 使用高亮暖色 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-pink-400/40 blur-[100px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-orange-300/40 blur-[100px] mix-blend-screen animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[40%] w-[60%] h-[60%] rounded-full bg-violet-400/30 blur-[120px] mix-blend-screen animate-pulse delay-2000" />
      </div>

      {/* 4. 粒子系统 - 樱花/光尘风格 */}
      <div className="absolute inset-0">
        {particleStyles.map((style, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full bg-white/80 blur-[0.5px] animate-float-particle"
            style={style}
          />
        ))}
      </div>

      {/* 5. 极光流线 - 改为柔和的光晕 */}
      <div className="absolute -top-[50%] left-[50%] h-[200%] w-[200%] -translate-x-1/2 animate-[spin_120s_linear_infinite] rounded-[40%] bg-gradient-to-b from-transparent via-white/10 to-transparent blur-3xl opacity-50" />

      {/* 6. 噪点纹理 - 减少不透明度，更干净 */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
    </div>
  );
}

function Sidebar({
  user,
  isAuthenticated,
  hasPending,
  onNavigate,
  open,
  onOpenChange,
}: {
  user: PortalUser;
  isAuthenticated: boolean;
  hasPending: boolean;
  onNavigate: (item: NavItem) => void;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const roleLabel = user.role === "admin" ? "管理员" : isAuthenticated ? "普通用户" : "访客";

  const sidebarContent = (
    <div className="flex h-full flex-col gap-6 border-r border-white/20 bg-white/5 px-6 py-8 backdrop-blur-2xl shadow-[5px_0_30px_rgba(0,0,0,0.05)]">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-white/70 drop-shadow-sm">akira</p>
        <p className="text-lg font-bold tracking-[0.34em] text-white drop-shadow-md">私人主控</p>
      </div>
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md shadow-sm">
        <p className="text-sm text-white/70">身份</p>
        <p className="text-xl font-bold text-white drop-shadow-sm">{user.displayName}</p>
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300 font-medium drop-shadow-sm">
          {roleLabel}
        </p>
      </div>
      <nav className="flex-1 space-y-6">
        {navSections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 text-xs uppercase tracking-[0.32em] text-white/50 font-bold">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items
                .filter((item) => (item.adminOnly ? user.role === "admin" : true))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/5 px-3 py-2 text-left transition hover:border-white/30 hover:bg-white/10 hover:shadow-sm"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-white/90 group-hover:text-white">
                      <item.icon className="h-4 w-4 text-white/70 transition group-hover:text-white group-hover:scale-110" />
                      {item.label}
                    </span>
                    {item.id === "audit" && hasPending && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md shadow-sm">
        <p className="text-xs uppercase tracking-[0.32em] text-white/70">系统 Uptime</p>
        <p className="text-2xl font-bold text-emerald-300 drop-shadow-sm">{user.metricSummary.uptime}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </div>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 border-white/20 bg-slate-900/80 backdrop-blur-xl p-0">
          <div className="max-h-screen overflow-y-auto">{sidebarContent}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TopBar({
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/5 px-6 py-5 backdrop-blur-xl lg:px-10 shadow-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold drop-shadow-sm">
            personal portal
          </p>
          <p className="text-xl font-black tracking-wide drop-shadow-md">AKIRA // PRIVATE</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {hasPending && (
          <Badge className="bg-rose-500 text-[11px] uppercase tracking-wide shadow-md border-none animate-pulse">
            待审核
          </Badge>
        )}

        {canCreateCard && (
          <Button className="gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            新建卡片
          </Button>
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
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-left text-sm text-white transition hover:border-white/40"
        onClick={handleToggle}
      >
        <Avatar className="h-9 w-9 border border-white/30">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-sm font-medium">{user.displayName}</span>
          <span className="text-xs text-white/50">
            {roleLabel}
          </span>
        </div>
      </button>
      <div
        className={cn(
          "absolute right-0 top-full w-48 pt-2",
          "rounded-2xl border border-white/10 bg-[#080c1a]/95 p-2 text-sm text-white shadow-2xl transition-all",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10"
          onClick={handleProfileClick}
        >
          <Settings className="h-4 w-4 text-white/60" />
          个人设置
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10 disabled:opacity-50"
          onClick={handleAuthClick}
          disabled={sessionLoading}
        >
          {isAuthenticated ? (
            <>
              <LogOut className="h-4 w-4 text-white/60" />
              退出登录
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 text-white/60" />
              登录
            </>
          )}
        </button>
      </div>
    </div>
  );
}


function Hero({ user, friend }: { user: PortalUser; friend?: FriendEntry | null }) {
  const roleLabel = user.role === "admin" ? "核心管理员" : "正式成员";
  const tags =
    friend?.tags?.map((tag) => ({ label: tag.label, likes: tag.likes })) ?? user.tags;
  const alias = friend?.alias ?? tags[0]?.label ?? "未命名轨道";
  const signature = friend?.signature ?? user.signature;

  const stats = friend?.stats;
  const metrics = stats
    ? [
      { label: "活跃度", value: `${Math.round(stats.activityScore)}`, detail: "最近综合" },
      { label: "累计喜欢", value: `${stats.likes}`, detail: "含标签心意" },
      { label: "交流次数", value: `${stats.comments}`, detail: "发帖 + 评论" },
      { label: "陪伴天数", value: `${stats.companionshipDays} 天`, detail: "注册以来" },
    ]
    : [
      { label: "日记数量", value: `${user.metricSummary.entries}`, detail: "全部记录" },
      { label: "Uptime", value: user.metricSummary.uptime, detail: "基础服务" },
      { label: "邀请名额", value: `${user.metricSummary.invites}`, detail: "剩余额度" },
      { label: "个人标签", value: `${tags.length}`, detail: "星群" },
    ];

  return (
    <section className="group relative overflow-hidden rounded-[40px] p-[2px] transition-all duration-500 hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.1)]">
      {/* 1. 动态流光边框 */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-rose-500/30 opacity-40 animate-[pulse-glow_8s_ease-in-out_infinite]" />

      {/* 2. 玻璃态主体背景 */}
      <div className="relative h-full w-full rounded-[38px] bg-[#0a0f1e]/60 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">

        {/* 3. 内部氛围光效 */}
        <div className="absolute -left-20 -top-20 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10 blur-[100px] mix-blend-screen pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-500/10 to-rose-500/10 blur-[100px] mix-blend-screen pointer-events-none" />

        {/* 4. 内容容器 */}
        <div className="relative p-8 lg:p-10 space-y-10">

          {/* 顶部：个人信息 */}
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex items-center gap-6">
              {/* 头像容器 */}
              <div className="relative group/avatar">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-400 to-rose-400 blur-md opacity-50 group-hover/avatar:opacity-80 transition-opacity duration-500" />
                <Avatar className="relative h-28 w-28 border-2 border-white/20 shadow-2xl">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} className="object-cover" />
                  <AvatarFallback className="bg-slate-900 text-white text-2xl">{user.displayName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] uppercase tracking-widest text-white/90 whitespace-nowrap shadow-lg">
                  {roleLabel}
                </div>
              </div>

              {/* 文本信息 */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 drop-shadow-sm">
                    {user.displayName}
                  </h1>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 font-mono">
                    @{user.username}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-cyan-200/80 font-medium tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  <span>{alias}</span>
                </div>
              </div>
            </div>

            {/* 签名卡片 */}
            <div className="relative group/quote max-w-md w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-2xl blur-sm opacity-0 group-hover/quote:opacity-100 transition-opacity" />
              <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">今日寄语</p>
                <p className="text-base text-white/80 leading-relaxed font-light italic">
                  "{signature || "暂无签名"}"
                </p>
              </div>
            </div>
          </div>

          {/* 中部：数据指标 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, idx) => (
              <div
                key={metric.label}
                className="group/metric relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/metric:opacity-20 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white blur-2xl" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-1">{metric.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white tracking-tight">{metric.value}</span>
                </div>
                <p className="text-xs text-white/40 mt-1 font-medium">{metric.detail}</p>
              </div>
            ))}
          </div>

          {/* 底部：标签云 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-60">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="text-xs uppercase tracking-[0.3em] text-white">标签星群</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {tags.map((tag) => (
                  <div
                    key={tag.label}
                    className="group/tag relative px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/90">{tag.label}</span>
                      <span className="flex items-center text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full">
                        <span className="mr-0.5">♥</span> {tag.likes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-white/30 py-2">暂无标签记录</p>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

function CardGrid({
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
                "group relative w-full overflow-hidden rounded-[32px] p-[2px] text-left transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:scale-[1.02]",
                card.glow
              )}
            >
              {/* 1. 边框：使用高亮白色半透明，营造动漫描边感 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-white/60 opacity-80 animate-[pulse-glow_7s_ease-in-out_infinite]" />

              {/* 2. 基础背景层：高透亮色玻璃态 (Frosted Glass) */}
              <div className="absolute inset-[2px] rounded-[30px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-inner" />

              {/* 3. 内部内容容器 */}
              <div className="relative h-full w-full rounded-[30px] overflow-hidden">

                {/* 3.1 氛围光效：更柔和、更明亮 */}
                <div className={cn(
                  "absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-40 blur-[80px] mix-blend-screen transition-all duration-700 group-hover:opacity-60 animate-[pulse-glow_6.5s_ease-in-out_infinite]",
                  `bg-gradient-to-br ${card.accent}`
                )} />

                {/* 3.2 辅助光效 */}
                <div className={cn(
                  "absolute -right-20 -bottom-20 h-[400px] w-[400px] rounded-full opacity-30 blur-[60px] mix-blend-screen transition-all duration-700 group-hover:opacity-50 animate-[pulse-glow_7.5s_ease-in-out_infinite]",
                  `bg-gradient-to-tl ${card.accent}`
                )} style={{ animationDelay: "1s" }} />

                {/* 3.3 顶部高光：增强玻璃质感 */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80" />

                {/* 3.4 动漫风斜纹装饰 (可选，这里用微弱的噪点代替) */}
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />

                {/* 3.5 专属图案动画层 */}
                {card.id === 'life-journal' && (
                  <>
                    {/* 静态大爱心 - 增加发光 */}
                    <div className="absolute right-8 bottom-8 opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20 group-hover:drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-rose-500">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    {/* 动态四散爱心粒子 - 增加数量和随机性 */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {heartParticles.map((particle, i) => (
                        <div
                          key={i}
                          className="absolute text-rose-400 opacity-0 group-hover:animate-float-particle"
                          style={{
                            left: `${particle.left}%`,
                            bottom: "20%",
                            fontSize: `${particle.fontSize}px`,
                            color: particle.color,
                            "--tx": `${particle.tx}px`,
                            "--ty": `${particle.ty}px`,
                            "--r": `${particle.rotation}deg`,
                            "--s": `${particle.scale}`,
                            "--d": `${particle.duration}s`,
                            animationDelay: `${particle.delay}s`,
                          } as React.CSSProperties}
                        >
                          ❤️
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {card.id === 'approvals' && (
                  <div className="absolute right-10 bottom-10 opacity-5 transition-all duration-500 group-hover:opacity-15 group-hover:rotate-12 group-hover:drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-cyan-500">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  </div>
                )}

                {card.id === 'system-settings' && (
                  <div className="absolute right-10 bottom-10 opacity-5 transition-all duration-700 group-hover:opacity-15 group-hover:rotate-90 group-hover:drop-shadow-[0_0_20px_rgba(148,163,184,0.5)]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-56 w-56 text-slate-400">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </div>
                )}

                {/* 3.6 内容布局 */}
                <div className="relative flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between z-10">

                  {/* 左侧信息 */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]", card.id === 'approvals' ? 'text-rose-400 bg-rose-400' : 'text-cyan-300 bg-cyan-300')} />
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70 drop-shadow-sm">{card.type}</p>
                      {card.badge && (
                        <Badge variant="outline" className="border-white/30 bg-white/20 text-[10px] uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
                          {card.badge}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-md transition-all group-hover:scale-[1.02] group-hover:text-white">
                        {card.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-white/80 drop-shadow-sm transition-colors group-hover:text-white">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  {/* 右侧指标 */}
                  {card.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-3 lg:justify-end">
                      {card.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="group/metric relative min-w-[160px] overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-5 py-4 transition-all hover:border-white/40 hover:bg-white/20 shadow-sm backdrop-blur-sm"
                        >
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold transition-colors group-hover/metric:text-white/80">
                              {metric.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white drop-shadow-md">
                              {metric.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 装饰性箭头 */}
                  <div className="absolute right-8 top-8 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 lg:static lg:opacity-100 lg:group-hover:translate-x-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/20">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
    </div>
  );
}

interface SlidingPanelProps {
  activeCard: PortalCard | null;
  insight?: CardInsight;
  open: boolean;
  onClose: () => void;
  onApprovalsUpdate?: () => void;
  onCardsUpdate?: () => void;
}

function SlidingPanel({
  activeCard,
  insight,
  open,
  onClose,
  onApprovalsUpdate,
  onCardsUpdate,
}: SlidingPanelProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-0 right-0 left-0 top-20 flex justify-end transition duration-500 ease-out z-50 lg:left-72",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="pointer-events-auto relative h-full w-full max-w-[1300px] shadow-[-20px_0_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl overflow-hidden">
        {/* 左侧渐变光效边框 - 极细且柔和，消除切割感 */}
        <div className="absolute left-0 top-20 bottom-20 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent z-30 opacity-70" />

        {/* 左边缘柔光 - 扩大范围，营造光晕融合感 */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/10 to-transparent z-20 pointer-events-none mix-blend-overlay" />

        {/* 背景层 - 使用与主页呼应的深色渐变，但透明度较低以遮挡主页内容 */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/95 via-purple-950/95 to-slate-950/95" />

        {/* 装饰光斑 - 增加层次感 */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

        {/* 悬浮关闭按钮 - 固定在右上角，不随内容滚动 */}
        <Button
          variant="ghost"
          className="absolute right-6 top-6 z-20 text-white/50 hover:bg-white/10 hover:text-white rounded-full h-10 w-10 p-0 backdrop-blur-md transition-colors"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* 统一滚动容器 - 标题和内容一起滚动 */}
        <div className="relative h-full w-full overflow-y-auto p-6 custom-scrollbar z-10">
          <div className="mb-8 pr-12 border-b border-white/10 pb-6">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-bold">模块细节</p>
            <h2 className="text-3xl font-black text-white drop-shadow-md mt-2">
              {activeCard?.title ?? "选择一个卡片"}
            </h2>
            <p className="text-sm text-white/80 font-medium mt-2 leading-relaxed">{activeCard?.description}</p>
          </div>

          {activeCard?.id === "life-journal" ? (
            <JournalFeed />
          ) : activeCard?.id === "friends" ? (
            <FriendsPanel />
          ) : activeCard?.id === "approvals" ? (
            <ApprovalsPanel onUpdate={onApprovalsUpdate} />
          ) : activeCard?.id === "system-settings" ? (
            <SystemSettingsPanel onUpdate={onCardsUpdate} />
          ) : activeCard && insight ? (
            <div className="space-y-8 pb-10">
              <Section title="设计摘要">
                <p className="text-base leading-relaxed text-white/90 font-medium">{insight.summary}</p>
              </Section>
              {insight.recentEntries && (
                <Section title="最近动态">
                  <div className="space-y-4">
                    {insight.recentEntries.map((entry) => (
                      <Card key={entry.id} className="border-white/20 bg-white/10 p-5 text-white/90 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">{entry.timestamp}</p>
                        <h4 className="mt-2 text-xl font-bold text-white">{entry.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed">{entry.excerpt}</p>
                      </Card>
                    ))}
                  </div>
                </Section>
              )}
              <Section title="亮点">
                <ul className="space-y-3 text-sm text-white/90 font-medium">
                  {insight.highlights.map((highlight) => (
                    <li key={highlight} className="relative pl-6 flex items-center">
                      <span className="absolute left-0 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="下一步">
                <ul className="space-y-3 text-sm text-white/90 font-medium">
                  {insight.todos.map((todo) => (
                    <li key={todo} className="relative pl-6 flex items-center">
                      <span className="absolute left-0 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.6)]" />
                      {todo}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-white/60 font-medium">
              选择任意卡片以查看细节
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p>
      <div>{children}</div>
    </div>
  );
}
