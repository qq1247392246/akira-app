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
import { fetchCards } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LogIn, LogOut, Menu, Settings, Sparkles, X } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { AuthSheet } from "@/components/auth-sheet";
import { JournalFeed } from "@/components/journal-feed";
import { ApprovalsPanel } from "@/components/approvals-panel";
import { SystemSettingsPanel } from "@/components/system-settings-panel";
import { ProfileSheet } from "@/components/profile-sheet";
import { fetchApprovals } from "@/lib/api";

export function AkiraShell({
  cards: initialCards = portalCards,
  user = portalUser,
}: {
  cards?: PortalCard[];
  user?: PortalUser;
}) {
  const [cards, setCards] = useState<PortalCard[]>(initialCards);
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
      let fetchedCards = await fetchCards();
      if (sessionUser?.role === 1) {
        fetchedCards = await refreshApprovalsBadge(fetchedCards);
      }
      setCards(fetchedCards);
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    }
  }, [sessionUser, refreshApprovalsBadge]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

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
      return {
        ...user,
        role: "user",
      };
    }
    return {
      ...user,
      username: sessionUser.username,
      displayName: sessionUser.displayName,
      role: sessionUser.role === 1 ? "admin" : "user",
      avatarUrl: sessionUser.avatarUrl ?? user.avatarUrl,
      signature: sessionUser.signature ?? user.signature,
    };
  }, [sessionUser, user]);

  const handleCardClick = useCallback((card: PortalCard) => {
    setActiveCard(card);
    setPanelOpen(true);
  }, []);

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
    }
  }, [setSessionUser]);

  const activeInsight: CardInsight | undefined = activeCard
    ? cardInsights[activeCard.id]
    : undefined;

  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-[#01040e] text-white"
      suppressHydrationWarning
    >
      <AnimatedBackground />
      <div className="relative z-10 flex h-screen">
        <Sidebar
          user={resolvedUser}
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
          <main className="relative flex-1 overflow-hidden px-4 pb-10 pt-4 sm:px-6 lg:px-10">
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-20">
                <Hero user={resolvedUser} />
                <CardGrid cards={cards} onSelect={handleCardClick} user={resolvedUser} />
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
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050816]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.2),transparent)]" />
      <div className="absolute -top-24 left-1/2 h-[120%] w-[120%] -translate-x-1/2 animate-[spin_60s_linear_infinite] rounded-full bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/5 to-emerald-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-30 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
    </div>
  );
}

function Sidebar({
  user,
  hasPending,
  onNavigate,
  open,
  onOpenChange,
}: {
  user: PortalUser;
  hasPending: boolean;
  onNavigate: (item: NavItem) => void;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const sidebarContent = (
    <div className="flex h-full flex-col gap-4 border-r border-white/5 bg-black/30 px-4 py-6 backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-white/60">akira</p>
        <p className="text-lg font-semibold tracking-[0.34em] text-white">私人主控</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/60">身份</p>
        <p className="text-xl font-semibold text-white">{user.displayName}</p>
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
          {user.role === "admin" ? "管理员" : "普通用户"}
        </p>
      </div>
      <nav className="flex-1 space-y-6">
        {navSections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 text-xs uppercase tracking-[0.32em] text-white/40">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.items
                .filter((item) => (item.adminOnly ? user.role === "admin" : true))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/5 px-3 py-2 text-left transition hover:border-white/30"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-white/80">
                      <item.icon className="h-4 w-4 text-white/60 transition group-hover:text-white" />
                      {item.label}
                    </span>
                    {item.id === "audit" && hasPending && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.32em] text-white/60">系统 Uptime</p>
        <p className="text-2xl font-semibold text-emerald-300">{user.metricSummary.uptime}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </div>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 border-white/10 bg-[#050916]/95 p-0">
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-4 backdrop-blur-2xl lg:px-10">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/80">
            personal portal
          </p>
          <p className="text-xl font-semibold">AKIRA // PRIVATE</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasPending && (
          <Badge className="bg-red-500/80 text-[11px] uppercase tracking-wide">待审核</Badge>
        )}
        {canCreateCard && (
          <Button className="gap-2 bg-white/10 text-white hover:bg-white/20">
            <Sparkles className="h-4 w-4" />
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
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-sm font-medium">{user.displayName}</span>
          <span className="text-xs text-white/50">
            {user.role === "admin" ? "管理员" : "访客"}
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


function Hero({ user }: { user: PortalUser }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">主控台</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            欢迎回来，{user.displayName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">{user.signature}</p>
        </div>
        <div className="flex gap-4">
          <MetricBlock label="日记数量" value={`${user.metricSummary.entries}`} />
          <MetricBlock label="Uptime" value={user.metricSummary.uptime} />
          <MetricBlock label="邀请名额" value={`${user.metricSummary.invites}`} />
        </div>
      </div>
      <Separator className="my-6 border-white/10" />
      <div className="flex flex-wrap gap-3">
        {user.tags.map((tag) => (
          <Badge key={tag.label} variant="secondary" className="bg-white/10 text-white">
            {tag.label}
            <span className="ml-2 text-xs text-cyan-300">+{tag.likes}</span>
          </Badge>
        ))}
      </div>
    </section>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#050916]/80 px-5 py-3 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
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
  return (
    <div className="space-y-4">
      {cards
        .filter((card) => (card.adminOnly ? user.role === "admin" : true))
        .map((card) => (
          <button
            key={card.id}
            id={`card-${card.id}`}
            onClick={() => onSelect(card)}
            className={cn(
              "group w-full rounded-[28px] border border-white/10 bg-gradient-to-br p-[1px] text-left",
              card.glow
            )}
          >
            <div
              className={cn(
                "rounded-[26px] bg-black/50 p-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:bg-black/40",
                `bg-gradient-to-br ${card.accent}`
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/70">{card.type}</p>
                    {card.badge && (
                      <Badge className="bg-black/60 text-[11px] uppercase tracking-tight text-white">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-white/80">{card.description}</p>
                </div>
                {card.metrics.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    {card.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="min-w-[140px] rounded-2xl border border-white/20 bg-black/20 px-4 py-2 text-sm text-white/80"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{metric.label}</p>
                        <p className="text-lg font-semibold text-white">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
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
        "pointer-events-none absolute inset-y-0 right-0 flex w-full transition duration-500 ease-out",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="pointer-events-auto flex h-full w-full flex-col border-l border-white/10 bg-[#01040e]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">模块细节</p>
            <h2 className="text-2xl font-semibold text-white">
              {activeCard?.title ?? "选择一个卡片"}
            </h2>
            <p className="text-sm text-white/70">{activeCard?.description}</p>
          </div>
          <Button variant="ghost" className="text-white/70 hover:bg-white/10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {activeCard?.id === "life-journal" ? (
          <div className="flex-1 overflow-y-auto">
            <JournalFeed />
          </div>
        ) : activeCard?.id === "approvals" ? (
          <div className="flex-1 overflow-y-auto">
            <ApprovalsPanel onUpdate={onApprovalsUpdate} />
          </div>
        ) : activeCard?.id === "system-settings" ? (
          <div className="flex-1 overflow-y-auto">
            <SystemSettingsPanel onUpdate={onCardsUpdate} />
          </div>
        ) : activeCard && insight ? (
          <div className="space-y-6 overflow-y-auto pr-2">
            <Section title="设计摘要">
              <p className="text-sm leading-relaxed text-white/80">{insight.summary}</p>
            </Section>
            {insight.recentEntries && (
              <Section title="最近动态">
                <div className="space-y-3">
                  {insight.recentEntries.map((entry) => (
                    <Card key={entry.id} className="border-white/10 bg-white/5 p-4 text-white/80">
                      <p className="text-sm uppercase tracking-[0.3em] text-white/60">{entry.timestamp}</p>
                      <h4 className="mt-1 text-lg font-semibold text-white">{entry.title}</h4>
                      <p className="mt-1 text-sm">{entry.excerpt}</p>
                    </Card>
                ))}
                </div>
              </Section>
            )}
            <Section title="亮点">
              <ul className="space-y-2 text-sm text-white/80">
                {insight.highlights.map((highlight) => (
                  <li key={highlight} className="relative pl-4">
                    <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-cyan-300" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="下一步">
              <ul className="space-y-2 text-sm text-white/80">
                {insight.todos.map((todo) => (
                  <li key={todo} className="relative pl-4">
                    <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-fuchsia-300" />
                    {todo}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/60">
            选择任意卡片以查看细节
          </div>
        )}
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
