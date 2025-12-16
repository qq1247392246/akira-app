import { type LucideIcon, Cpu, FileText, Settings, Shield, UsersRound, Zap } from "lucide-react";

export type CardMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type PortalCard = {
  id: string;
  title: string;
  description: string;
  badge?: string;
  accent: string;
  glow: string;
  metrics: CardMetric[];
  type: "internal" | "external";
  targetUrl?: string;
  adminOnly?: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  targetCard?: string;
  adminOnly?: boolean;
};

export type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

export type UserTag = {
  label: string;
  likes: number;
};

export type PortalUser = {
  username: string;
  displayName: string;
  role: "user" | "admin";
  avatarUrl: string;
  signature: string;
  metricSummary: { entries: number; uptime: string; invites: number };
  tags: UserTag[];
};

export type CardInsight = {
  summary: string;
  highlights: string[];
  todos: string[];
  recentEntries?: { id: string; title: string; timestamp: string; excerpt: string }[];
};

export const portalUser: PortalUser = {
  username: "akira",
  displayName: "Akira 秋明",
  role: "admin",
  avatarUrl:
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=280&h=280&q=80",
  signature: "NEUROLINK ONLINE · 科技自留地，随时切换身份。",
  metricSummary: {
    entries: 132,
    uptime: "99.97%",
    invites: 4,
  },
  tags: [
    { label: "Cyberpunk Engineer", likes: 27 },
    { label: "情绪捕手", likes: 15 },
    { label: "夜间巡航", likes: 9 },
  ],
};

export const navSections: NavSection[] = [
  {
    id: "primary",
    title: "常驻模块",
    items: [
      { id: "journal", label: "生活日记", icon: FileText, targetCard: "life-journal" },
      { id: "friends", label: "朋友卡片", icon: UsersRound, targetCard: "friends" },
      { id: "play", label: "摸鱼空间", icon: Zap, targetCard: "playground" },
    ],
  },
  {
    id: "admin",
    title: "管理员",
    items: [
      {
        id: "audit",
        label: "注册审核",
        icon: Shield,
        targetCard: "approvals",
        adminOnly: true,
      },
      {
        id: "system",
        label: "系统设置",
        icon: Settings,
        targetCard: "system-settings",
        adminOnly: true,
      },
    ],
  },
  {
    id: "labs",
    title: "实验场",
    items: [
      { id: "stack", label: "技术栈", icon: Cpu, targetCard: "stack" },
    ],
  },
];

export const portalCards: PortalCard[] = [
  {
    id: "life-journal",
    title: "生活日记",
    description: "倒序记录当天的情绪、照片与灵感，一键滑入沉浸式阅读。",
    badge: "alpha",
    accent: "from-cyan-400/70 via-blue-500/50 to-fuchsia-500/50",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.45)]",
    metrics: [
      { label: "今日更新", value: "3 条" },
      { label: "全部记录", value: "132" },
      { label: "点赞", value: "890" },
    ],
    type: "internal",
  },
  {
    id: "friends",
    title: "朋友卡片",
    description: "以卡片的形式收藏朋友，支持标签、心跳与隐藏彩蛋。",
    accent: "from-rose-400/70 via-orange-500/60 to-amber-400/50",
    glow: "shadow-[0_0_40px_rgba(251,113,133,0.35)]",
    metrics: [
      { label: "已收录", value: "18 位" },
      { label: "今日互动", value: "+5" },
    ],
    type: "internal",
  },
  {
    id: "playground",
    title: "摸鱼空间",
    description: "收集轻量小游戏与互动实验，随时打开放松。",
    accent: "from-emerald-400/70 via-teal-500/60 to-cyan-400/50",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.45)]",
    metrics: [
      { label: "上线玩法", value: "7" },
      { label: "计划中", value: "3" },
    ],
    type: "internal",
  },
  {
    id: "approvals",
    title: "注册审核",
    description: "查看待审批用户并决定是否放行，红点提示实时更新。",
    badge: "3 pending",
    accent: "from-purple-400/70 via-indigo-500/60 to-blue-500/40",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.45)]",
    metrics: [
      { label: "等待中", value: "3" },
      { label: "本周通过", value: "5" },
    ],
    type: "internal",
    adminOnly: true,
  },
  {
    id: "system-settings",
    title: "系统设置",
    description: "维护导航卡片、背景以及自定义动效。",
    accent: "from-slate-300/50 via-slate-500/40 to-slate-800/40",
    glow: "shadow-[0_0_40px_rgba(148,163,184,0.35)]",
    metrics: [
      { label: "卡片", value: "6" },
      { label: "背景", value: "4" },
    ],
    type: "internal",
    adminOnly: true,
  },
  {
    id: "stack",
    title: "技术栈观测",
    description: "记录当前使用的技术组合与实验性想法。",
    accent: "from-sky-400/70 via-blue-500/50 to-cyan-500/50",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
    metrics: [
      { label: "核心组件", value: "5" },
      { label: "实验", value: "2" },
    ],
    type: "internal",
  },
];

export const cardInsights: Record<string, CardInsight> = {
  "life-journal": {
    summary:
      "全部记录按时间倒序排列，纯文本 + emoji + 配图。评论上限 100 词，允许一层嵌套，帖子支持编辑与删除。",
    highlights: [
      "无限滚动，拖动右侧细滚动条可快速定位",
      "点赞区展示所有头像与昵称，并跟随实时数据",
      "评论删除后保留占位，提示“该评论被清理”",
    ],
    todos: [
      "接入真实 Supabase 数据源",
      "实现评论单层嵌套校验",
      "调优动效在弱网环境下的降级策略",
    ],
    recentEntries: [
      {
        id: "entry-1",
        title: "0058 · 夜航",
        timestamp: "今天 22:14",
        excerpt: "外环高架像脉冲，雨滴打在头盔上，想记录的不是景，而是当下的心率。",
      },
      {
        id: "entry-2",
        title: "0057 · 断句",
        timestamp: "今天 09:26",
        excerpt: "早晨把代办写成诗句后，执行效率反而更高。",
      },
    ],
  },
  friends: {
    summary:
      "朋友卡片用于展示头像、联系标签与可自定义的彩蛋区域。支持对别人的标签点赞、排序。",
    highlights: [
      "标签右上角显示红心计数，点击飞出粒子",
      "可切换矩阵或瀑布流布局",
      "未来考虑加“密语”通道",
    ],
    todos: [
      "实现标签点赞写入",
      "增加卡片筛选（按心跳、最近互动）",
    ],
  },
  playground: {
    summary: "聚合打发时间的小玩法，使用 iframe 或本地 canvas 均可。",
    highlights: [
      "每个项目是独立沙盒，互不影响",
      "可设置活跃状态，决定是否放在主层",
    ],
    todos: [
      "收集更多小玩法灵感",
      "为移动端设计轻量入口",
    ],
  },
  approvals: {
    summary:
      "注册审核只展示用户名 + 同意/拒绝，命令式流程，后续如需备注再扩展。",
    highlights: [
      "有待审时左侧导航显示红点",
      "批量操作时也会同步通知",
    ],
    todos: [
      "设计审核 API 与日志",
      "完成管理员提示音效",
    ],
  },
  "system-settings": {
    summary:
      "管理员在此维护卡片顺序、背景素材以及导航。",
    highlights: [
      "拖拽调整顺序立刻体现在首页",
      "背景可以配置 GIF，默认带蒙版",
    ],
    todos: [
      "实现 Gitee 图床上传组件",
      "保存卡片布局模板",
    ],
  },
  stack: {
    summary: "Next.js + shadcn/ui + Supabase，登录逻辑由 API Route 校验后写入 session。",
    highlights: [
      "前端信任 session，不做二次校验",
      "图片直接走 Gitee 图床，不做冗余",
    ],
    todos: [
      "补充自动化部署流程",
      "输出性能指标监控面板",
    ],
  },
};

