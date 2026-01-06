"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { type PortalCard, type CardInsight } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";

const JournalFeed = dynamic(() => import("@/components/journal-feed").then((mod) => ({ default: mod.JournalFeed })), {
  loading: () => <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white/30" /></div>,
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
  onClose: () => void;
  onApprovalsUpdate?: () => void;
  onCardsUpdate?: () => void;
}

export function SlidingPanel({
  activeCard,
  insight,
  open,
  onClose,
  onApprovalsUpdate,
  onCardsUpdate,
}: SlidingPanelProps) {
  return (
    <div className={cn("pointer-events-none fixed bottom-0 right-0 left-0 top-20 flex justify-end transition duration-500 ease-out z-50 lg:left-72", open ? "translate-x-0" : "translate-x-full")}>
      <div className="pointer-events-auto relative h-full w-full max-w-[1300px] shadow-[-20px_0_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl overflow-hidden">
        <div className="absolute left-0 top-20 bottom-20 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent z-30 opacity-70" />
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/10 to-transparent z-20 pointer-events-none mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/95 via-purple-950/95 to-slate-950/95" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <Button variant="ghost" className="absolute right-6 top-6 z-20 text-white/50 hover:bg-white/10 hover:text-white rounded-full h-10 w-10 p-0 backdrop-blur-md transition-colors" onClick={onClose}><X className="h-6 w-6" /></Button>

        <div className="relative h-full w-full overflow-y-auto p-6 custom-scrollbar z-10">
          <div className="mb-8 pr-12 border-b border-white/10 pb-6">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-bold">模块细节</p>
            <h2 className="text-3xl font-black text-white drop-shadow-md mt-2">{activeCard?.title ?? "选择一个卡片"}</h2>
            <p className="text-sm text-white/80 font-medium mt-2 leading-relaxed">{activeCard?.description}</p>
          </div>

          {activeCard?.id === "life-journal" ? <JournalFeed /> :
           activeCard?.id === "friends" ? <FriendsPanel /> :
           activeCard?.id === "playground" ? <PlaygroundPanel /> :
           activeCard?.id === "approvals" ? <ApprovalsPanel onUpdate={onApprovalsUpdate} /> :
           activeCard?.id === "system-settings" ? <SystemSettingsPanel onUpdate={onCardsUpdate} /> :
           activeCard && insight ? (
            <div className="space-y-8 pb-10">
              <Section title="设计摘要"><p className="text-base leading-relaxed text-white/90 font-medium">{insight.summary}</p></Section>
              {insight.recentEntries && (
                <Section title="最近动态">
                  <div className="space-y-4">{insight.recentEntries.map((entry) => (
                      <Card key={entry.id} className="border-white/20 bg-white/10 p-5 text-white/90 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">{entry.timestamp}</p>
                        <h4 className="mt-2 text-xl font-bold text-white">{entry.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed">{entry.excerpt}</p>
                      </Card>
                    ))}</div>
                </Section>
              )}
              <Section title="亮点"><ul className="space-y-3 text-sm text-white/90 font-medium">{insight.highlights.map((highlight) => <li key={highlight} className="relative pl-6 flex items-center"><span className="absolute left-0 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />{highlight}</li>)}</ul></Section>
              <Section title="下一步"><ul className="space-y-3 text-sm text-white/90 font-medium">{insight.todos.map((todo) => <li key={todo} className="relative pl-6 flex items-center"><span className="absolute left-0 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.6)]" />{todo}</li>)}</ul></Section>
            </div>
          ) : <div className="flex h-64 items-center justify-center text-sm text-white/60 font-medium">选择任意卡片以查看细节</div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p><div>{children}</div></div>;
}
