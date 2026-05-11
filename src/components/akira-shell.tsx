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
import { fetchApprovals, fetchCards, fetchFriends } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-provider";
import { AuthSheet } from "@/components/auth-sheet";
import { ProfileSheet } from "@/components/profile-sheet";
import { cn } from "@/lib/utils";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user: sessionUser, setUser: setSessionUser, loading: sessionLoading } = useSession();
  const refreshApprovalsBadge = useCallback(async (currentCards: PortalCard[]) => {
    if (sessionUser?.role !== 1) return currentCards;

    try {
      const pending = await fetchApprovals({ status: "pending" });
      const count = pending.length;

      return currentCards.map((card) => {
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

      fetchedCards = fetchedCards.map((fetchedCard) => {
        const mockCard = initialCards.find((card) => card.id === fetchedCard.id);
        if (!mockCard) return fetchedCard;

        return {
          ...fetchedCard,
          metrics: fetchedCard.metrics && fetchedCard.metrics.length > 0 ? fetchedCard.metrics : mockCard.metrics,
          glow: fetchedCard.glow || mockCard.glow,
          accent: fetchedCard.accent || mockCard.accent,
          type: fetchedCard.type || mockCard.type,
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
      setCardsError("卡片列表加载失败，已回退到本地样式稿。");
      setCards(initialCards);
    }
  }, [initialCards, refreshApprovalsBadge, sessionUser]);

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

      setCards((prev) =>
        prev.map((card) => {
          if (card.id === "approvals") {
            return {
              ...card,
              badge: count > 0 ? `${count} Pending` : "",
            };
          }
          return card;
        })
      );
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
  }, [selfFriend, sessionUser, user]);

  useEffect(() => {
    if (!panelOpen) return;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previousBodyStyle = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousHtmlStyle = {
      overflow: documentElement.style.overflow,
      overscrollBehavior: documentElement.style.overscrollBehavior,
    };

    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = previousHtmlStyle.overflow;
      documentElement.style.overscrollBehavior = previousHtmlStyle.overscrollBehavior;
      body.style.overflow = previousBodyStyle.overflow;
      body.style.position = previousBodyStyle.position;
      body.style.top = previousBodyStyle.top;
      body.style.width = previousBodyStyle.width;
      window.scrollTo(0, scrollY);
    };
  }, [panelOpen]);

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

  const handleNavigate = useCallback(
    (item: NavItem) => {
      setMobileSidebarOpen(false);

      if (!item.targetCard) {
        setPanelOpen(false);
        return;
      }

      const targetCard = cards.find((card) => card.id === item.targetCard) ?? null;

      if (!targetCard) {
        setPanelOpen(false);
        return;
      }

      setActiveCard(targetCard);
      setPanelOpen(true);

      requestAnimationFrame(() => {
        const element = document.getElementById(`card-${item.targetCard}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [cards]
  );

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

  const activeInsight: CardInsight | undefined = activeCard ? cardInsights[activeCard.id] : undefined;

  const visibleCards = useMemo(() => {
    if (resolvedUser.role === "admin") return cards;
    return cards.filter((card) => !card.adminOnly && !ADMIN_CARD_IDS.has(card.id ?? ""));
  }, [cards, resolvedUser.role]);

  return (
    <div className="relative h-app-viewport overflow-hidden text-foreground" suppressHydrationWarning>
      <AnimatedBackground />
      <div className="relative z-10 flex h-full min-h-0 flex-col lg:flex-row">
        <Sidebar
          user={resolvedUser}
          isAuthenticated={Boolean(sessionUser)}
          hasPending={hasPending}
          onNavigate={handleNavigate}
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!panelOpen && (
            <TopBar
              onMenuClick={() => setMobileSidebarOpen(true)}
              user={resolvedUser}
              hasPending={hasPending}
              isAuthenticated={Boolean(sessionUser)}
              sessionLoading={sessionLoading}
              onRequestAuth={() => setAuthOpen(true)}
              onLogout={handleLogout}
              onOpenProfile={() => setProfileOpen(true)}
            />
          )}

          <main className="relative min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-7xl space-y-8 px-4 pb-36 pt-5 sm:px-6 sm:pt-6 lg:px-8">
                <Hero user={resolvedUser} friend={selfFriend} />

                {cardsError && (
                  <div className="rounded-[1.6rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.32)] bg-[rgb(var(--accent-coral-rgb)/0.1)] px-4 py-4 text-foreground shadow-[0_6px_0_rgb(var(--ink-rgb)/0.04)]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm">{cardsError}</span>
                      <Button size="sm" variant="outline" onClick={refreshCards}>
                        重新拉取
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
              sidebarCollapsed={sidebarCollapsed}
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
  const doodles = [
    {
      className:
        "left-[6%] top-[10%] h-24 w-28 bg-[rgb(var(--accent-rose-rgb)/0.18)]",
      shape: "rounded-[38%_62%_43%_57%/48%_43%_57%_52%]",
      delay: "0s",
    },
    {
      className:
        "right-[8%] top-[16%] h-16 w-24 border-2 border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--accent-butter-rgb)/0.14)]",
      shape: "rounded-[52%_48%_58%_42%/39%_57%_43%_61%]",
      delay: "2s",
    },
    {
      className:
        "left-[12%] bottom-[18%] h-20 w-20 bg-[rgb(var(--accent-sage-rgb)/0.18)]",
      shape: "rounded-[58%_42%_45%_55%/51%_31%_69%_49%]",
      delay: "4s",
    },
    {
      className:
        "right-[10%] bottom-[12%] h-28 w-24 bg-[rgb(var(--accent-coral-rgb)/0.14)]",
      shape: "rounded-[44%_56%_58%_42%/41%_47%_53%_59%]",
      delay: "1s",
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,241,0.96),rgba(249,241,229,0.98))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(246,176,196,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(244,213,110,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(186,202,151,0.16),transparent_20%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(69,54,41,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(69,54,41,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(69,54,41,0.08)_1px,transparent_0)] bg-[size:18px_18px] opacity-25" />

      {doodles.map((doodle, index) => (
        <div
          key={index}
          className={cn("absolute blur-xl animate-paper-drift", doodle.className, doodle.shape)}
          style={{ animationDelay: doodle.delay }}
        />
      ))}
    </div>
  );
}
