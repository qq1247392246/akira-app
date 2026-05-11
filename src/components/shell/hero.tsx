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
        { label: "活跃度", value: `${Math.round(stats.activityScore)}`, detail: "最近 30 天" },
        { label: "累计喜欢", value: `${stats.likes}`, detail: "含标签心意" },
        { label: "交流次数", value: `${stats.comments}`, detail: "动态与评论" },
        { label: "陪伴天数", value: `${stats.companionshipDays} 天`, detail: "从注册开始计算" },
      ]
    : [
        { label: "日记数量", value: `${user.metricSummary.entries}`, detail: "当前公开记录" },
        { label: "系统 Uptime", value: user.metricSummary.uptime, detail: "基础服务状态" },
        { label: "邀请名额", value: `${user.metricSummary.invites}`, detail: "暂留入口余量" },
        { label: "个人标签", value: `${tags.length}`, detail: "常用关键词" },
      ];

  return (
    <section className="sketch-surface relative overflow-hidden bg-[rgb(var(--paper-soft-rgb)/0.9)] p-5 sm:p-6 md:p-7">
      <div className="pointer-events-none absolute right-6 top-8 hidden h-14 w-24 rounded-[44%_56%_39%_61%/43%_33%_67%_57%] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-butter-rgb)/0.12)] animate-scribble-sway sm:block" />

      <div className="relative flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex w-fit shrink-0 flex-col items-center gap-2.5 sm:items-start">
              <div className="relative">
                <div className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-[37%_63%_46%_54%/50%_43%_57%_50%] bg-[rgb(var(--ink-rgb)/0.07)]" />
                <Avatar className="relative h-24 w-24 rounded-[39%_61%_48%_52%/47%_42%_58%_53%] border-2 border-[rgb(var(--ink-rgb)/0.16)] bg-[rgb(var(--paper-soft-rgb))] sm:h-28 sm:w-28">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} className="object-cover" />
                  <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.22)] text-2xl font-semibold tracking-[-0.08em] text-foreground">
                    {user.displayName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="inline-flex w-fit max-w-[13rem] items-center justify-center rounded-full border-2 border-[rgb(var(--ink-rgb)/0.16)] bg-[rgb(var(--paper-soft-rgb)/0.94)] px-3.5 py-1.5 text-center text-[11px] font-medium leading-4 tracking-[0.16em] text-foreground shadow-[0_3px_0_rgb(var(--ink-rgb)/0.055)]">
                {roleLabel}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--ink-muted-rgb))]">personal notebook</p>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{user.displayName}</h1>
                  <span className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.88)] px-3 py-1 text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
                  <span>{alias}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.72)] px-4 py-4 sm:px-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[rgb(var(--ink-muted-rgb))]">今日寄语</p>
            <p className="mt-3 text-base leading-relaxed text-foreground">“{signature || "今天先留白，等你写下新一句。"}”</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="rounded-[1.25rem] border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.72)] px-4 py-3 shadow-[0_3px_0_rgb(var(--ink-rgb)/0.035)]"
              style={{
                transform: `rotate(${index % 2 === 0 ? "-0.25deg" : "0.25deg"})`,
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-[rgb(var(--ink-muted-rgb))]">{metric.label}</p>
              <p className="mt-1.5 text-xl font-semibold text-foreground sm:text-2xl">{metric.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t-2 border-dashed border-[rgb(var(--ink-rgb)/0.1)] pt-5">
          <div className="flex items-center gap-3 sm:max-w-lg">
            <div className="h-px flex-1 bg-[rgb(var(--ink-rgb)/0.12)]" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-[rgb(var(--ink-muted-rgb))]">最近常用标签</span>
            <div className="h-px flex-1 bg-[rgb(var(--ink-rgb)/0.12)]" />
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag, index) => (
                <div
                  key={tag.label}
                  className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.88)] px-4 py-2 text-sm text-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.05)]"
                  style={{ transform: `rotate(${index % 3 === 0 ? "-1deg" : index % 3 === 1 ? "1.2deg" : "-0.3deg"})` }}
                >
                  <span>{tag.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">喜欢 {tag.likes}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">当前还没有常驻标签，后续会跟着你的朋友卡片与动态慢慢填满。</p>
          )}
        </div>
      </div>
    </section>
  );
}
