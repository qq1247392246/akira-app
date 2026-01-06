"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cardInsights,
  portalCards,
  portalUser,
  type CardInsight,
  type PortalCard,
  type PortalUser,
} from "@/data/mock";
import { type FriendEntry } from "@/data/friends";
import { fetchCards, fetchFriends } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-provider";
import { AuthSheet } from "@/components/auth-sheet";
import { ProfileSheet } from "@/components/profile-sheet";
import { fetchApprovals } from "@/lib/api";

import { Sidebar, type NavItem } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { Hero } from "@/components/shell/hero";
import { CardGrid } from "@/components/shell/card-grid";
import { SlidingPanel } from "@/components/shell/sliding-panel";

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

export function AkiraShell({
  cards: initialCards = portalCards,
  user = portalUser,
}: {
  cards?: PortalCard[];
  user?: PortalUser;
}) {
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
