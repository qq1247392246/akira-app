"use client";

import { navSections, type NavItem, type PortalUser } from "@/data/mock";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type { NavItem };

export function Sidebar({
  user,
  isAuthenticated,
  hasPending,
  onNavigate,
  open,
  onOpenChange,
  collapsed,
  onCollapsedChange,
}: {
  user: PortalUser;
  isAuthenticated: boolean;
  hasPending: boolean;
  onNavigate: (item: NavItem) => void;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}) {
  const roleLabel = user.role === "admin" ? "管理员" : isAuthenticated ? "普通用户" : "访客";
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (item.adminOnly ? user.role === "admin" : true)),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (
    <div className="paper-texture flex h-full flex-col gap-5 border-r-2 border-[rgb(var(--ink-rgb)/0.12)] px-5 py-6">
      <div className="space-y-3 rounded-[1.5rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.76)] px-5 py-4 shadow-[0_5px_0_rgb(var(--ink-rgb)/0.04)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--ink-muted-rgb))]">akira</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">私人主控</p>
            <p className="text-xs text-muted-foreground">手帐式入口台</p>
          </div>
          <div className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-rose-rgb)/0.45)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground">
            {roleLabel}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.76)] px-4 py-4 shadow-[0_4px_0_rgb(var(--ink-rgb)/0.035)]">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">当前身份</p>
        <p className="mt-2 text-xl font-semibold text-foreground">{user.displayName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{isAuthenticated ? "已登录，可进入个人数据与管理区。" : "游客浏览模式，可先查看再决定是否登录。"}</p>
      </div>

      <nav className="flex-1 space-y-6">
        {navSections.map((section) => (
          <div key={section.id}>
            <p className="mb-3 px-1 text-[11px] uppercase tracking-[0.32em] text-[rgb(var(--ink-muted-rgb))]">
              {section.title}
            </p>
            <div className="space-y-2.5">
              {section.items
                .filter((item) => (item.adminOnly ? user.role === "admin" : true))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item)}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-[1.25rem] border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.78)] px-4 py-3 text-left shadow-[0_3px_0_rgb(var(--ink-rgb)/0.035)] transition-all duration-200 hover:-translate-y-px hover:bg-[rgb(var(--paper-soft-rgb)/0.96)]",
                      item.id === "audit" && hasPending && "border-[rgb(var(--accent-coral-rgb)/0.44)]"
                    )}
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[1rem] border border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-butter-rgb)/0.22)] text-[rgb(var(--ink-rgb)/0.86)] transition-transform group-hover:rotate-[-6deg]">
                        <item.icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </span>
                    {item.id === "audit" && hasPending ? (
                      <span className="flex h-3 w-3 rounded-full bg-[rgb(var(--accent-coral-rgb))] shadow-[0_0_0_4px_rgb(var(--accent-coral-rgb)/0.18)]" />
                    ) : (
                      <span className="text-sm text-[rgb(var(--ink-muted-rgb))] transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-[1.5rem] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.6)] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">系统 Uptime</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{user.metricSummary.uptime}</p>
        <p className="mt-2 text-sm text-muted-foreground">入口稳定运行中。</p>
      </div>
    </div>
  );

  const collapsedContent = (
    <div className="paper-texture flex h-full flex-col items-center gap-4 border-r-2 border-[rgb(var(--ink-rgb)/0.12)] px-3 py-5">
      <button
        type="button"
        onClick={() => onCollapsedChange(false)}
        className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)] text-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.04)] transition hover:-translate-y-px"
        aria-label="展开左侧导航"
        title="展开导航"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-rose-rgb)/0.36)] text-sm font-semibold text-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.04)]">
        {user.displayName.slice(0, 1)}
      </div>

      <nav className="mt-2 flex flex-1 flex-col items-center gap-3">
        {visibleSections.flatMap((section) =>
          section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item)}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-[1.1rem] border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.78)] text-[rgb(var(--ink-rgb)/0.86)] shadow-[0_3px_0_rgb(var(--ink-rgb)/0.035)] transition hover:-translate-y-px hover:bg-[rgb(var(--paper-soft-rgb)/0.96)]",
                item.id === "audit" && hasPending && "border-[rgb(var(--accent-coral-rgb)/0.44)]"
              )}
              aria-label={item.label}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              {item.id === "audit" && hasPending ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-coral-rgb))]" />
              ) : null}
            </button>
          ))
        )}
      </nav>
    </div>
  );

  return (
    <>
      <div className={cn("hidden shrink-0 transition-[width] duration-300 lg:block", collapsed ? "w-24" : "w-80")}>
        <div className="sticky top-0 h-screen overflow-y-auto">
          {collapsed ? (
            collapsedContent
          ) : (
            <div className="relative h-full">
              {sidebarContent}
              <button
                type="button"
                onClick={() => onCollapsedChange(true)}
                className="absolute right-3 top-7 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.9)] text-foreground shadow-[0_3px_0_rgb(var(--ink-rgb)/0.04)] transition hover:-translate-y-px"
                aria-label="收起左侧导航"
                title="收起导航"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="sketch-sheet-scope w-[min(20rem,calc(100vw_-_1rem))] border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.96)] p-0 shadow-[0_18px_32px_rgb(var(--ink-rgb)/0.12)]"
        >
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <SheetDescription className="sr-only">打开私人门户导航并切换不同模块。</SheetDescription>
          <div className="h-app-viewport overflow-y-auto overscroll-contain">{sidebarContent}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
