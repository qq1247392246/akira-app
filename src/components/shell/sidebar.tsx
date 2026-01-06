"use client";

import { navSections, type NavItem, type PortalUser } from "@/data/mock";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type { NavItem };

export function Sidebar({
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
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300 font-medium drop-shadow-sm">{roleLabel}</p>
      </div>
      <nav className="flex-1 space-y-6">
        {navSections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 text-xs uppercase tracking-[0.32em] text-white/50 font-bold">{section.title}</p>
            <div className="space-y-2">
              {section.items.filter((item) => (item.adminOnly ? user.role === "admin" : true)).map((item) => (
                <button key={item.id} onClick={() => onNavigate(item)} className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/5 px-3 py-2 text-left transition hover:border-white/30 hover:bg-white/10 hover:shadow-sm">
                  <span className="flex items-center gap-3 text-sm font-medium text-white/90 group-hover:text-white"><item.icon className="h-4 w-4 text-white/70 transition group-hover:text-white group-hover:scale-110" />{item.label}</span>
                  {item.id === "audit" && hasPending && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]" />}
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
      <div className="hidden w-72 shrink-0 lg:block"><div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div></div>
      <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="left" className="w-72 border-white/20 bg-slate-900/80 backdrop-blur-xl p-0"><div className="max-h-screen overflow-y-auto">{sidebarContent}</div></SheetContent></Sheet>
    </>
  );
}
