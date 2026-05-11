"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { type PortalCard, type CardInsight } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";

const JournalFeed = dynamic(() => import("@/components/journal-feed").then((mod) => ({ default: mod.JournalFeed })), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--ink-muted-rgb))]" />
    </div>
  ),
  ssr: false,
});
const FriendsPanel = dynamic(() => import("@/components/friends-panel").then((mod) => ({ default: mod.FriendsPanel })), { ssr: false });
const PlaygroundPanel = dynamic(() => import("@/components/playground-panel").then((mod) => ({ default: mod.PlaygroundPanel })), { ssr: false });
const ApprovalsPanel = dynamic(() => import("@/components/approvals-panel").then((mod) => ({ default: mod.ApprovalsPanel })), { ssr: false });
const SystemSettingsPanel = dynamic(() => import("@/components/system-settings-panel").then((mod) => ({ default: mod.SystemSettingsPanel })), { ssr: false });

interface SlidingPanelProps {
  activeCard: PortalCard | null;
  insight?: CardInsight;
  open: boolean;
  sidebarCollapsed?: boolean;
  onClose: () => void;
  onApprovalsUpdate?: () => void;
  onCardsUpdate?: () => void;
}

export function SlidingPanel({
  activeCard,
  insight,
  open,
  sidebarCollapsed = false,
  onClose,
  onApprovalsUpdate,
  onCardsUpdate,
}: SlidingPanelProps) {
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[1200] flex justify-end px-0 transition duration-500 ease-out lg:bottom-0 lg:right-0 lg:top-0 lg:z-[120]",
        sidebarCollapsed ? "lg:left-24" : "lg:left-80",
        open ? "translate-x-0" : "translate-x-[105%]"
      )}
      aria-hidden={!open}
    >
      <div className="sketch-panel-scope pointer-events-auto relative h-full w-full overflow-hidden border-l-0 border-t-0 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.98)] shadow-[-18px_0_38px_rgb(var(--ink-rgb)/0.12)] lg:border-l-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(246,176,196,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,213,110,0.18),transparent_26%),linear-gradient(180deg,rgba(255,248,241,0.92),rgba(252,244,235,0.98))]" />
        <div className="pointer-events-none absolute right-8 top-8 h-16 w-24 rounded-[42%_58%_57%_43%/34%_39%_61%_66%] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--accent-butter-rgb)/0.18)] animate-scribble-sway" />
        <div className="pointer-events-none absolute left-8 top-16 hidden h-px w-24 bg-[rgb(var(--ink-rgb)/0.14)] sm:block" />

        {!imageLightboxOpen && (
          <Button
            variant="ghost"
            className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 min-w-11"
            onClick={onClose}
            aria-label="关闭侧滑面板"
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        <div className="relative z-10 h-full overflow-x-hidden overflow-y-auto overscroll-contain p-4 pt-[max(1rem,env(safe-area-inset-top))] custom-scrollbar sm:p-5 lg:p-6">
          <div className="mb-5 rounded-[1.5rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.86)] px-4 py-4 pr-14 shadow-[0_8px_0_rgb(var(--ink-rgb)/0.05)] sm:mb-6 sm:rounded-[1.8rem] sm:px-5 sm:py-5">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[rgb(var(--ink-muted-rgb))]">右侧展开区</p>
            <h2 className="mt-2 break-words text-xl font-semibold text-foreground sm:text-2xl lg:text-3xl">{activeCard?.title ?? "先选择一个卡片"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {activeCard?.description ?? "这里会承接每张卡片的详细内容。现在整体壳层已经替换成手绘纸张风，内部模块会跟随统一色系落在同一套视觉系统里。"}
            </p>
          </div>

          {activeCard?.id === "life-journal" ? (
            <JournalFeed onLightboxOpenChange={setImageLightboxOpen} />
          ) : activeCard?.id === "friends" ? (
            <FriendsPanel />
          ) : activeCard?.id === "playground" ? (
            <PlaygroundPanel />
          ) : activeCard?.id === "approvals" ? (
            <ApprovalsPanel onUpdate={onApprovalsUpdate} />
          ) : activeCard?.id === "system-settings" ? (
            <SystemSettingsPanel onUpdate={onCardsUpdate} />
          ) : activeCard && insight ? (
            <div className="space-y-8 pb-10">
              <Section title="设计摘要">
                <p className="text-base leading-relaxed text-foreground">{insight.summary}</p>
              </Section>
              {insight.recentEntries && (
                <Section title="最近动态">
                  <div className="space-y-4">
                    {insight.recentEntries.map((entry) => (
                      <Card key={entry.id} className="bg-[rgb(var(--paper-soft-rgb)/0.82)] p-5 text-foreground shadow-[0_6px_0_rgb(var(--ink-rgb)/0.04)]">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{entry.timestamp}</p>
                        <h4 className="mt-2 text-xl font-semibold text-foreground">{entry.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.excerpt}</p>
                      </Card>
                    ))}
                  </div>
                </Section>
              )}
              <Section title="亮点">
                <ul className="space-y-3 text-sm text-foreground">
                  {insight.highlights.map((highlight) => (
                    <li key={highlight} className="relative pl-6">
                      <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-coral-rgb))]" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="下一步">
                <ul className="space-y-3 text-sm text-foreground">
                  {insight.todos.map((todo) => (
                    <li key={todo} className="relative pl-6">
                      <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-butter-rgb))]" />
                      {todo}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              先在主页点开任意卡片，这里会显示对应的详细内容。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[rgb(var(--ink-muted-rgb))]">{title}</p>
      <div>{children}</div>
    </div>
  );
}
