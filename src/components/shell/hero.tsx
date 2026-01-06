"use client";

import { type PortalUser } from "@/data/mock";
import { type FriendEntry } from "@/data/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

export function Hero({ user, friend }: { user: PortalUser; friend?: FriendEntry | null }) {
  const roleLabel = user.role === "admin" ? "核心管理员" : "正式成员";
  const tags = friend?.tags?.map((tag) => ({ label: tag.label, likes: tag.likes })) ?? user.tags;
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
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-rose-500/30 opacity-40 animate-pulse-glow" />
      <div className="relative h-full w-full rounded-[38px] bg-[#0a0f1e]/60 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute -left-20 -top-20 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10 blur-[100px] mix-blend-screen pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-500/10 to-rose-500/10 blur-[100px] mix-blend-screen pointer-events-none" />

        <div className="relative p-8 lg:p-10 space-y-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex items-center gap-6">
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
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 drop-shadow-sm">{user.displayName}</h1>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 font-mono">@{user.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-cyan-200/80 font-medium tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  <span>{alias}</span>
                </div>
              </div>
            </div>
            <div className="relative group/quote max-w-md w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-2xl blur-sm opacity-0 group-hover/quote:opacity-100 transition-opacity" />
              <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">今日寄语</p>
                <p className="text-base text-white/80 leading-relaxed font-light italic">"{signature || "暂无签名"}"</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="group/metric relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/metric:opacity-20 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white blur-2xl" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-1">{metric.label}</p>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-black text-white tracking-tight">{metric.value}</span></div>
                <p className="text-xs text-white/40 mt-1 font-medium">{metric.detail}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 opacity-60"><div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" /><span className="text-xs uppercase tracking-[0.3em] text-white">标签星群</span><div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" /></div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {tags.map((tag) => (
                  <div key={tag.label} className="group/tag relative px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default"><div className="flex items-center gap-2"><span className="text-sm text-white/90">{tag.label}</span><span className="flex items-center text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full"><span className="mr-0.5">♥</span> {tag.likes}</span></div></div>
                ))}
              </div>
            ) : <p className="text-center text-sm text-white/30 py-2">暂无标签记录</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
