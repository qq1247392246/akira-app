"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useSession } from "@/components/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type FriendEntry } from "@/data/friends";
import {
  addFriendBadgeApi,
  addFriendTagApi,
  fetchFriends,
  removeFriendBadgeApi,
  removeFriendTagApi,
  toggleFriendTagLikeApi,
  updateFriend,
  updateProfile,
  uploadMedia,
} from "@/lib/api";
import {
  Award,
  Calendar,
  Camera,
  Crown,
  Heart,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

type RankingMetric = "activity" | "likes" | "comments";

type ProfileUpdates = {
  alias?: string | null;
  isAdmin?: boolean;
  location?: string | null;
  story?: string | null;
  customAreaTitle?: string | null;
  customAreaHighlight?: string | null;
  accentClass?: string | null;
  neonClass?: string | null;
  signature?: string | null;
};

const rankingModes: { id: RankingMetric; label: string; description: string }[] = [
  { id: "activity", label: "活跃度", description: "按最近 30 天互动热度排序" },
  { id: "likes", label: "好感值", description: "点赞总数 + 标签心意" },
  { id: "comments", label: "对话量", description: "动态、回复与评论合计" },
];

const themePresets = [
  {
    id: "petal-note",
    label: "花瓣便签",
    accent: "from-[rgb(var(--accent-rose-rgb)/0.32)] via-[rgb(var(--accent-coral-rgb)/0.18)] to-transparent",
    neon: "shadow-[0_18px_28px_rgba(69,54,41,0.08)]",
    description: "柔和粉橘水彩感",
  },
  {
    id: "morning-page",
    label: "晨光纸页",
    accent: "from-[rgb(var(--accent-butter-rgb)/0.34)] via-[rgb(var(--accent-coral-rgb)/0.18)] to-transparent",
    neon: "shadow-[0_16px_26px_rgba(69,54,41,0.08)]",
    description: "偏暖的清晨纸色",
  },
  {
    id: "sage-trace",
    label: "鼠尾草笔触",
    accent: "from-[rgb(var(--accent-sage-rgb)/0.32)] via-[rgb(var(--accent-butter-rgb)/0.12)] to-transparent",
    neon: "shadow-[0_16px_26px_rgba(69,54,41,0.07)]",
    description: "安静的绿色纸面痕迹",
  },
  {
    id: "berry-wash",
    label: "莓果晕染",
    accent: "from-[rgb(var(--accent-rose-rgb)/0.26)] via-[rgb(var(--accent-sage-rgb)/0.1)] to-[rgb(var(--accent-coral-rgb)/0.2)]",
    neon: "shadow-[0_20px_30px_rgba(69,54,41,0.08)]",
    description: "更浓一点的手工涂色",
  },
  {
    id: "tea-stain",
    label: "茶渍边缘",
    accent: "from-[rgb(var(--accent-coral-rgb)/0.18)] via-[rgb(var(--accent-butter-rgb)/0.28)] to-transparent",
    neon: "shadow-[0_14px_24px_rgba(69,54,41,0.08)]",
    description: "像旧纸页留下的暖色边晕",
  },
];

const badgeColorOptions = [
  { id: "berry", label: "莓果贴纸", className: "from-rose-300 via-orange-200 to-amber-200" },
  { id: "honey", label: "蜂蜜纸条", className: "from-amber-200 via-yellow-200 to-orange-300" },
  { id: "garden", label: "花园墨迹", className: "from-emerald-200 via-lime-100 to-teal-200" },
  { id: "sky", label: "淡蓝便利贴", className: "from-sky-200 via-cyan-100 to-blue-200" },
  { id: "graphite", label: "铅笔灰", className: "from-stone-200 via-stone-300 to-zinc-400" },
];
export function FriendsPanel() {
  const { user: sessionUser, setUser } = useSession();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const friendCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollId = useRef<string | null>(null);

  const canInteract = Boolean(sessionUser);
  const isAdmin = sessionUser?.role === 1;
  const viewerId = sessionUser?.id;

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchFriends({ viewerId });
      setFriends(items);
    } catch (err) {
      console.error("加载朋友卡片失败", err);
      setError("无法加载朋友卡片，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const replaceFriend = useCallback((updated: FriendEntry) => {
    setFriends((prev) => {
      const next = prev.some((f) => f.id === updated.id)
        ? prev.map((friend) => (friend.id === updated.id ? updated : friend))
        : [...prev, updated];
      return next;
    });
  }, []);

  const handleAvatarUpdatedState = useCallback(
    (friendId: string, avatarUrl: string) => {
      setFriends((prev) => prev.map((friend) => (friend.id === friendId ? { ...friend, avatarUrl } : friend)));
      if (sessionUser && sessionUser.id === friendId) {
        setUser({ ...sessionUser, avatarUrl });
      }
    },
    [sessionUser, setUser]
  );

  const ranking = useMemo(() => {
    const sorted = [...friends].sort((a, b) => {
      if (rankingMetric === "likes") {
        return b.stats.likes - a.stats.likes;
      }
      if (rankingMetric === "comments") {
        return b.stats.comments - a.stats.comments;
      }
      return b.stats.activityScore - a.stats.activityScore;
    });
    return sorted.slice(0, 3);
  }, [friends, rankingMetric]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [...friends];
    return friends.filter((friend) => {
      const haystack = [
        friend.displayName,
        friend.alias ?? "",
        friend.username,
        friend.location ?? "",
        friend.signature ?? "",
        friend.story ?? "",
        friend.customAreaTitle ?? "",
        friend.customAreaHighlight ?? "",
        friend.tags.map((tag) => tag.label).join(" "),
        friend.badges.map((badge) => badge.label).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [friends, searchQuery]);

  const handleProfileUpdate = useCallback(
    async (friendId: string, updates: ProfileUpdates) => {
      if (!sessionUser) return;
      const canEdit = isAdmin || sessionUser.id === friendId;
      if (!canEdit) return;
      try {
        const updated = await updateFriend(friendId, {
          ...updates,
          actorRole: isAdmin ? 1 : 0,
          actorId: sessionUser.id,
          viewerId,
        });
        replaceFriend(updated);
      } catch (err) {
        console.error("更新朋友资料失败", err);
      }
    },
    [isAdmin, replaceFriend, sessionUser, viewerId]
  );

  const handleAliasUpdate = (friendId: string, alias: string) => {
    handleProfileUpdate(friendId, { alias: alias.trim() || null });
  };

  const handlePromoteAdmin = async (friendId: string) => {
    if (!isAdmin) return;
    const friend = friends.find((f) => f.id === friendId);
    if (!friend || friend.isAdmin) return;
    await handleProfileUpdate(friendId, { isAdmin: true });
  };

  const handleTagToggle = async (friendId: string, tagId: string) => {
    if (!canInteract || !sessionUser) return;
    try {
      const updated = await toggleFriendTagLikeApi(friendId, tagId, {
        userId: sessionUser.id,
        viewerId: viewerId ?? sessionUser.id,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("切换标签点赞状态失败", err);
    }
  };

  const handleAddTag = async (friendId: string, label: string) => {
    if (!canInteract || !sessionUser) return;
    const clean = label.trim();
    if (!clean) return;
    try {
      const updated = await addFriendTagApi(friendId, {
        label: clean,
        authorId: sessionUser.id,
        viewerId: viewerId ?? sessionUser.id,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("新增标签失败", err);
    }
  };

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    if (!isAdmin) return;
    try {
      const updated = await removeFriendTagApi(friendId, tagId, { actorRole: 1, viewerId });
      replaceFriend(updated);
    } catch (err) {
      console.error("删除标签失败", err);
    }
  };

  const handleAddBadge = async (friendId: string, label: string, colorClass: string) => {
    if (!isAdmin) return;
    const clean = label.trim();
    if (!clean) return;
    try {
      const updated = await addFriendBadgeApi(friendId, {
        label: clean,
        colorClass,
        actorRole: 1,
        viewerId,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("新增徽章失败", err);
    }
  };

  const handleRemoveBadge = async (friendId: string, badgeId: string) => {
    if (!isAdmin) return;
    try {
      const updated = await removeFriendBadgeApi(friendId, badgeId, { actorRole: 1, viewerId });
      replaceFriend(updated);
    } catch (err) {
      console.error("删除徽章失败", err);
    }
  };

  const handleThemeUpdate = async (friendId: string, accentClass: string | null, neonClass: string | null) => {
    await handleProfileUpdate(friendId, { accentClass, neonClass });
  };

  const registerFriendCard = useCallback((friendId: string, node: HTMLDivElement | null) => {
    if (node) {
      friendCardRefs.current[friendId] = node;
    } else {
      delete friendCardRefs.current[friendId];
    }
  }, []);

  const getScrollContainer = useCallback((node: HTMLElement | null): HTMLElement | Window | null => {
    if (typeof window === "undefined" || !node) return null;
    let parent = node.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style?.overflowY;
      const isScrollable = /(auto|scroll|overlay)/.test(overflowY);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  }, []);

  const focusFriendCard = useCallback(
    (friendId: string) => {
      const node = friendCardRefs.current[friendId];
      if (!node || typeof window === "undefined") return false;

      const container = getScrollContainer(node);
      if (container && container !== window && container instanceof HTMLElement) {
        const containerRect = container.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const offset = 48;
        const targetTop = container.scrollTop + (nodeRect.top - containerRect.top) - offset;
        container.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
      } else {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      node.focus?.({ preventScroll: true });
      return true;
    },
    [getScrollContainer]
  );

  const scrollToFriendCard = useCallback(
    (friendId: string) => {
      if (focusFriendCard(friendId)) {
        return;
      }
      pendingScrollId.current = friendId;
      if (searchQuery) {
        setSearchQuery("");
      } else {
        requestAnimationFrame(() => focusFriendCard(friendId));
      }
    },
    [focusFriendCard, searchQuery]
  );

  useEffect(() => {
    if (!pendingScrollId.current) return;
    const success = focusFriendCard(pendingScrollId.current);
    if (success) {
      pendingScrollId.current = null;
    }
  }, [filteredFriends, focusFriendCard]);
  return (
    <div className="space-y-8">
      <section className="sketch-surface sketch-wash paper-texture space-y-6 p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-display text-xs uppercase tracking-[0.38em] text-[rgb(var(--ink-muted-rgb))]">
              Friend Archive
            </p>
            <h2 className="flex items-center gap-2 font-display text-3xl text-foreground md:text-4xl">
              <Sparkles className="h-5 w-5 text-[rgb(var(--accent-coral-rgb))]" />
              朋友画册
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--ink-muted-rgb))]">
              {canInteract
                ? "给朋友加标签、写称呼、补上故事，让这本私人名册慢慢长出温度。"
                : "登录后可以参与标签互动，也能补充朋友的签名和小传。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rankingModes.map((mode) => (
              <Button
                key={mode.id}
                onClick={() => setRankingMetric(mode.id)}
                variant="ghost"
                className={cn(
                  "rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)] px-4 py-2 text-sm text-[rgb(var(--ink-muted-rgb))] shadow-[0_4px_0_rgb(var(--ink-rgb)/0.06)] transition hover:-translate-y-0.5 hover:text-foreground",
                  rankingMetric === mode.id &&
                    "border-[rgb(var(--accent-coral-rgb)/0.35)] bg-[rgb(var(--accent-coral-rgb)/0.12)] text-foreground"
                )}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--ink-muted-rgb))]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索朋友、标签或徽章"
              className="h-11 rounded-full pl-10"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-[rgb(var(--ink-muted-rgb))]">
            {searchQuery.trim()
              ? `已匹配 ${filteredFriends.length} / ${friends.length}`
              : `共收录 ${friends.length} 张朋友卡`}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ranking.map((friend, index) => (
            <div
              key={friend.id}
              role="button"
              tabIndex={0}
              onClick={() => scrollToFriendCard(friend.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  scrollToFriendCard(friend.id);
                }
              }}
              className="group sketch-surface relative cursor-pointer overflow-hidden border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.9)] p-5 transition duration-300 hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-[rgb(var(--accent-butter-rgb)/0.18)] blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.92)]">
                    <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                    <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.24)] text-foreground">
                      {friend.displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[rgb(var(--paper-soft-rgb))] text-xs font-semibold shadow-sm",
                      index === 0
                        ? "bg-[rgb(var(--accent-butter-rgb))] text-[rgb(var(--ink-rgb))]"
                        : index === 1
                          ? "bg-[rgb(var(--paper-card-rgb))] text-[rgb(var(--ink-rgb))]"
                          : "bg-[rgb(var(--accent-coral-rgb)/0.7)] text-[rgb(var(--paper-soft-rgb))]"
                    )}
                  >
                    {index + 1}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-lg font-semibold text-foreground">{friend.displayName}</p>
                    {index === 0 ? (
                      <Crown className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
                    ) : null}
                  </div>
                  <p className="truncate text-xs uppercase tracking-[0.2em] text-[rgb(var(--ink-muted-rgb))]">
                    {friend.stats.orbit}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-[1rem] border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.82)] px-4 py-3">
                <span className="text-xs text-[rgb(var(--ink-muted-rgb))]">
                  {rankingModes.find((mode) => mode.id === rankingMetric)?.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">
                    {rankingMetric === "activity"
                      ? friend.stats.activityScore
                      : rankingMetric === "likes"
                        ? friend.stats.likes
                        : friend.stats.comments}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--ink-muted-rgb))]">
                    pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-16">
        {error ? (
          <div className="rounded-[1.4rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.32)] bg-[rgb(var(--accent-coral-rgb)/0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="sketch-surface p-8 text-center text-[rgb(var(--ink-muted-rgb))]">
            正在加载朋友卡片…
          </div>
        ) : friends.length === 0 ? (
          <div className="sketch-surface p-8 text-center text-[rgb(var(--ink-muted-rgb))]">
            还没有任何朋友数据
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="sketch-surface p-8 text-center text-[rgb(var(--ink-muted-rgb))]">
            当前筛选没有匹配的卡片
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              canInteract={canInteract}
              canAdmin={isAdmin}
              isSelf={sessionUser?.id === friend.id}
              onToggleTagLike={handleTagToggle}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onUpdateProfile={handleProfileUpdate}
              onAliasUpdate={handleAliasUpdate}
              onPromoteAdmin={handlePromoteAdmin}
              onAddBadge={handleAddBadge}
              onRemoveBadge={handleRemoveBadge}
              onUpdateTheme={handleThemeUpdate}
              onAvatarUpdated={handleAvatarUpdatedState}
              registerCardRef={registerFriendCard}
            />
          ))
        )}
      </section>
    </div>
  );
}
function FriendCard({
  friend,
  canInteract,
  canAdmin,
  isSelf,
  onToggleTagLike,
  onAddTag,
  onRemoveTag,
  onUpdateProfile,
  onAliasUpdate,
  onPromoteAdmin,
  onAddBadge,
  onRemoveBadge,
  onUpdateTheme,
  onAvatarUpdated,
  registerCardRef,
}: {
  friend: FriendEntry;
  canInteract: boolean;
  canAdmin: boolean;
  isSelf: boolean;
  onToggleTagLike: (friendId: string, tagId: string) => void;
  onAddTag: (friendId: string, label: string) => void;
  onRemoveTag: (friendId: string, tagId: string) => void;
  onUpdateProfile: (friendId: string, updates: ProfileUpdates) => void;
  onAliasUpdate: (friendId: string, alias: string) => void;
  onPromoteAdmin: (friendId: string) => void;
  onAddBadge: (friendId: string, label: string, colorClass: string) => void;
  onRemoveBadge: (friendId: string, badgeId: string) => void;
  onUpdateTheme: (friendId: string, accentClass: string | null, neonClass: string | null) => void;
  onAvatarUpdated?: (friendId: string, avatarUrl: string) => void;
  registerCardRef: (friendId: string, node: HTMLDivElement | null) => void;
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasDraft, setAliasDraft] = useState(friend.alias ?? "");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState(friend.location ?? "");
  const [editingStory, setEditingStory] = useState(false);
  const [storyDraft, setStoryDraft] = useState(friend.story ?? "");
  const [customTitleDraft, setCustomTitleDraft] = useState(friend.customAreaTitle ?? "");
  const [customHighlightDraft, setCustomHighlightDraft] = useState(friend.customAreaHighlight ?? "");
  const [badgeLabelDraft, setBadgeLabelDraft] = useState("");
  const [selectedBadgeColor, setSelectedBadgeColor] = useState(badgeColorOptions[0]?.className ?? "");
  const [editingSignature, setEditingSignature] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState(friend.signature ?? "");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerCardRef(friend.id, node);
    },
    [friend.id, registerCardRef]
  );

  const canEditProfile = canAdmin || isSelf;
  const canChangeAvatar = isSelf;

  // 删除确认状态
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [deletingBadgeId, setDeletingBadgeId] = useState<string | null>(null);

  // 自动清除删除确认状态
  useEffect(() => {
    if (deletingTagId) {
      const timer = setTimeout(() => setDeletingTagId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deletingTagId]);

  useEffect(() => {
    if (deletingBadgeId) {
      const timer = setTimeout(() => setDeletingBadgeId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deletingBadgeId]);

  useEffect(() => {
    setAliasDraft(friend.alias ?? "");
  }, [friend.alias]);

  useEffect(() => {
    setLocationDraft(friend.location ?? "");
  }, [friend.location]);

  useEffect(() => {
    setStoryDraft(friend.story ?? "");
    setCustomTitleDraft(friend.customAreaTitle ?? "");
    setCustomHighlightDraft(friend.customAreaHighlight ?? "");
  }, [friend.story, friend.customAreaTitle, friend.customAreaHighlight]);

  useEffect(() => {
    setSignatureDraft(friend.signature ?? "");
  }, [friend.signature]);

  useEffect(() => {
    if (avatarError) {
      const timer = setTimeout(() => setAvatarError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [avatarError]);

  const tagTotal = friend.tags.reduce((sum, tag) => sum + tag.likes, 0) || 1;

  const handleAvatarClick = () => {
    if (!canChangeAvatar || avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("请上传图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("请上传 5MB 以内的图片");
      return;
    }
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const { url } = await uploadMedia(file);
      const updated = await updateProfile({ userId: friend.id, avatarUrl: url });
      const nextAvatar = updated.avatar_url ?? url;
      onAvatarUpdated?.(friend.id, nextAvatar);
    } catch (err) {
      console.error("更新头像失败", err);
      setAvatarError(err instanceof Error ? err.message : "头像更新失败");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAliasSave = () => {
    onAliasUpdate(friend.id, aliasDraft);
    setEditingAlias(false);
  };

  const handleLocationSave = () => {
    onUpdateProfile(friend.id, { location: locationDraft.trim() || null });
    setEditingLocation(false);
  };

  const handleStorySave = () => {
    onUpdateProfile(friend.id, {
      story: storyDraft.trim() || null,
      customAreaTitle: customTitleDraft.trim() || null,
      customAreaHighlight: customHighlightDraft.trim() || null,
    });
    setEditingStory(false);
  };

  const handleSignatureSave = () => {
    onUpdateProfile(friend.id, { signature: signatureDraft.trim() || null });
    setEditingSignature(false);
  };

  const handleAddTagClick = () => {
    if (!tagDraft.trim()) return;
    onAddTag(friend.id, tagDraft.trim());
    setTagDraft("");
    setAddingTag(false);
  };

  const handleAddBadgeClick = () => {
    if (!badgeLabelDraft.trim()) return;
    const color = selectedBadgeColor || badgeColorOptions[0]?.className || "from-slate-200 via-slate-400 to-slate-600";
    onAddBadge(friend.id, badgeLabelDraft.trim(), color);
    setBadgeLabelDraft("");
  };

  const cardWash =
    friend.accent?.includes("accent-sage") || friend.accent?.includes("emerald")
      ? "bg-[radial-gradient(circle_at_top_left,rgba(186,202,151,0.22),transparent_28%),linear-gradient(180deg,rgba(255,248,241,0.94),rgba(252,244,235,0.92))]"
      : friend.accent?.includes("accent-butter") || friend.accent?.includes("amber")
        ? "bg-[radial-gradient(circle_at_top_left,rgba(244,213,110,0.2),transparent_28%),linear-gradient(180deg,rgba(255,248,241,0.94),rgba(252,244,235,0.92))]"
        : "bg-[radial-gradient(circle_at_top_left,rgba(246,176,196,0.22),transparent_30%),linear-gradient(180deg,rgba(255,248,241,0.94),rgba(252,244,235,0.92))]";

  return (
    <article
      ref={setCardRef}
      tabIndex={-1}
      className="group sketch-surface relative overflow-hidden p-6 transition duration-300 hover:-translate-y-0.5"
    >
      <div className={cn("pointer-events-none absolute inset-0 opacity-90", cardWash)} />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:gap-10">
        <div className="flex flex-col items-center gap-3 text-center lg:w-48">
          <div className="relative group/avatar">
            <Avatar className="h-32 w-32 border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.92)] shadow-[0_10px_20px_rgb(var(--ink-rgb)/0.08)] transition">
              <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
              <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.26)] text-foreground">
                {friend.displayName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {canChangeAvatar && (
              <>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={avatarUploading}
                  className={cn(
                    "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-full text-xs font-semibold text-foreground transition-opacity duration-200",
                    "bg-[rgb(var(--paper-soft-rgb)/0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-coral-rgb)/0.4)]",
                    avatarUploading ? "opacity-100 cursor-wait" : "opacity-0 group-hover/avatar:opacity-100"
                  )}
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 className="mb-1 h-5 w-5 animate-spin text-[rgb(var(--ink-rgb))]" />
                      <span className="text-[10px] tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">上传中…</span>
                    </>
                  ) : (
                    <>
                      <Camera className="mb-1 h-5 w-5" />
                      <span className="text-[10px] tracking-[0.3em]">更换头像</span>
                    </>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelected}
                />
              </>
            )}
            {friend.isAdmin && (
              <span className="absolute -right-2 bottom-2 z-20 flex items-center gap-1 rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-butter-rgb)/0.8)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--ink-rgb))] shadow-sm">
                <Shield className="h-3 w-3" />
                管理员
              </span>
            )}
          </div>
          {avatarError && <p className="text-xs text-[rgb(var(--accent-coral-rgb))]">{avatarError}</p>}
          <div>
            <p className="text-xl font-semibold text-foreground">{friend.displayName}</p>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-[rgb(var(--ink-muted-rgb))]">
              {editingAlias ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={aliasDraft}
                    onChange={(event) => setAliasDraft(event.target.value)}
                    className="h-8 w-40 rounded-full text-center text-sm"
                  />
                  <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleAliasSave}>
                    <CheckIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                    onClick={() => {
                      setAliasDraft(friend.alias ?? "");
                      setEditingAlias(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="sketch-pill px-3 py-0.5 text-xs uppercase tracking-[0.2em] text-[rgb(var(--ink-muted-rgb))]">
                    {friend.alias || "未设置称号"}
                  </span>
                  {canEditProfile && (
                    <button
                      className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-1 text-[rgb(var(--ink-muted-rgb))] transition hover:text-foreground"
                      onClick={() => setEditingAlias(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">
              {editingLocation ? (
                <>
                  <Input
                    value={locationDraft}
                    onChange={(event) => setLocationDraft(event.target.value)}
                    className="h-8 w-40 rounded-full text-center text-[10px]"
                  />
                  <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleLocationSave}>
                    <CheckIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                    onClick={() => {
                      setLocationDraft(friend.location ?? "");
                      setEditingLocation(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span>{friend.location || "地点待补充"}</span>
                  {canEditProfile && (
                    <button
                      className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-1 text-[rgb(var(--ink-muted-rgb))] transition hover:text-foreground"
                      onClick={() => setEditingLocation(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {friend.badges.map((badge) => (
                <div key={`${friend.id}-${badge.label}-${badge.id ?? "temp"}`} className="group/badge relative">
                  <Badge className={cn("border-none text-xs font-semibold text-[rgb(var(--ink-rgb))] shadow-sm", "bg-gradient-to-r", badge.color)}>
                    {badge.label}
                  </Badge>
                  {canAdmin && badge.id && (
                    <button
                      className={cn(
                        "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full transition-all",
                        deletingBadgeId === badge.id
                          ? "bg-[rgb(var(--accent-coral-rgb))] text-[rgb(var(--paper-soft-rgb))] scale-110 z-10"
                          : "bg-[rgb(var(--paper-soft-rgb))] text-[rgb(var(--ink-muted-rgb))] hover:bg-[rgb(var(--accent-coral-rgb)/0.8)] hover:text-[rgb(var(--paper-soft-rgb))] opacity-0 group-hover/badge:opacity-100"
                      )}
                      onClick={() => {
                        if (deletingBadgeId === badge.id) {
                          onRemoveBadge(friend.id, badge.id as string);
                          setDeletingBadgeId(null);
                        } else {
                          setDeletingBadgeId(badge.id as string);
                        }
                      }}
                      title={deletingBadgeId === badge.id ? "确认删除" : "移除徽章"}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canAdmin && (
              <div className="rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-3">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[rgb(var(--ink-muted-rgb))]">徽章贴纸</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {badgeColorOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-full border-2 p-0.5",
                        selectedBadgeColor === option.className ? "border-[rgb(var(--ink-rgb)/0.35)] shadow-sm" : "border-transparent opacity-70"
                      )}
                      onClick={() => setSelectedBadgeColor(option.className)}
                      aria-label={option.label}
                    >
                      <span className={cn("block h-full w-full rounded-full bg-gradient-to-r", option.className)} />
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={badgeLabelDraft}
                    onChange={(event) => setBadgeLabelDraft(event.target.value)}
                    placeholder="新的徽章"
                    className="h-9 flex-1 rounded-full text-sm"
                    maxLength={16}
                  />
                  <Button size="sm" className="rounded-full px-4 text-xs" onClick={handleAddBadgeClick} disabled={!badgeLabelDraft.trim()}>
                    <Plus className="mr-1 h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            )}
          </div>

          {canAdmin &&
            (friend.isAdmin ? (
              <span className="sketch-pill px-3 py-1 text-xs text-[rgb(var(--ink-muted-rgb))]">已是管理员</span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.84)] px-3 text-xs text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                onClick={() => onPromoteAdmin(friend.id)}
              >
                设为管理员
              </Button>
            ))}
        </div>
        <div className="flex-1 space-y-6">
          <div className="rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-4">
            {editingSignature ? (
              <div className="space-y-2">
                <Textarea
                  value={signatureDraft}
                  onChange={(event) => setSignatureDraft(event.target.value)}
                  placeholder="输入新的签名"
                  className="min-h-[80px] rounded-2xl text-sm"
                  maxLength={140}
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                    onClick={() => {
                      setEditingSignature(false);
                      setSignatureDraft(friend.signature ?? "");
                    }}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSignatureSave}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-sm text-[rgb(var(--ink-muted-rgb))]">{friend.signature || "还没有签名"}</p>
                {canEditProfile && (
                  <button
                    className="rounded-full border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-1 text-[rgb(var(--ink-muted-rgb))] transition hover:text-foreground"
                    onClick={() => {
                      setSignatureDraft(friend.signature ?? "");
                      setEditingSignature(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <StatPill label="活跃度" value={friend.stats.activityScore} icon={<TrendingUp className="h-4 w-4" />} />
              <StatPill label="累计喜欢" value={friend.stats.likes} icon={<Heart className="h-4 w-4" />} />
              <StatPill label="交流次数" value={friend.stats.comments} icon={<MessageIcon />} />
              <StatPill label="陪伴天数" value={`${friend.stats.companionshipDays} 天`} icon={<Calendar className="h-4 w-4" />} />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">标签簿</h3>
              {!canInteract && <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">登录后可点赞或新增标签</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {friend.tags.map((tag) => {
                const ratio = Math.max(0.25, tag.likes / tagTotal);
                return (
                  <button
                    key={tag.id}
                    className={cn(
                      "group/tag relative flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-coral-rgb)/0.3)]",
                      tag.likedByMe
                        ? "border-[rgb(var(--accent-coral-rgb)/0.35)] bg-[rgb(var(--accent-rose-rgb)/0.14)] text-foreground"
                        : "border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.84)] text-[rgb(var(--ink-muted-rgb))] hover:text-foreground",
                      canInteract ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                    )}
                    style={{ flexGrow: ratio, minWidth: "120px" }}
                    onClick={() => canInteract && onToggleTagLike(friend.id, tag.id)}
                    type="button"
                  >
                    <span className="font-medium">{tag.label}</span>
                    <span className="flex items-center gap-1 text-xs text-[rgb(var(--ink-muted-rgb))]">
                      <Heart className={cn("h-3.5 w-3.5 transition", tag.likedByMe && "fill-current text-[rgb(var(--accent-coral-rgb))]")} />
                      {tag.likes}
                    </span>
                    {canAdmin && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={deletingTagId === tag.id ? "确认删除" : `移除标签 ${tag.label}`}
                        className={cn(
                          "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
                          deletingTagId === tag.id
                            ? "bg-[rgb(var(--accent-coral-rgb))] text-[rgb(var(--paper-soft-rgb))] opacity-100 scale-110 z-10"
                            : "bg-[rgb(var(--paper-soft-rgb))] text-[rgb(var(--ink-muted-rgb))] opacity-0 group-hover/tag:opacity-100 hover:bg-[rgb(var(--accent-coral-rgb)/0.8)] hover:text-[rgb(var(--paper-soft-rgb))]"
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (deletingTagId === tag.id) {
                            onRemoveTag(friend.id, tag.id);
                            setDeletingTagId(null);
                          } else {
                            setDeletingTagId(tag.id);
                          }
                        }}
                      >
                        {deletingTagId === tag.id ? (
                          <CheckIcon />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </span>
                    )}
                    {deletingTagId === tag.id && (
                      <span className="absolute -bottom-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-[rgb(var(--ink-rgb))] px-2 py-0.5 text-[10px] text-[rgb(var(--paper-soft-rgb))] shadow-sm pointer-events-none">
                        点击确认
                      </span>
                    )}
                    <span className="pointer-events-none absolute right-2 top-0 text-lg opacity-0 transition group-hover/tag:-translate-y-2 group-hover/tag:opacity-100">
                      {"❤️"}
                    </span>
                  </button>
                );
              })}
              {canInteract && (
                <>
                  {addingTag ? (
                    <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--ink-rgb)/0.18)] bg-[rgb(var(--paper-card-rgb)/0.84)] px-3 py-2">
                      <Input
                        value={tagDraft}
                        onChange={(event) => setTagDraft(event.target.value)}
                        placeholder="输入新的标签"
                        className="h-9 w-40 rounded-full border-none bg-transparent text-sm"
                        maxLength={16}
                      />
                      <Button size="icon" className="h-9 w-9 rounded-full" onClick={handleAddTagClick}>
                        <CheckIcon />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                        onClick={() => {
                          setTagDraft("");
                          setAddingTag(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setAddingTag(true)}
                      variant="ghost"
                      className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--ink-rgb)/0.18)] bg-[rgb(var(--paper-card-rgb)/0.84)] px-4 py-2 text-sm text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      添加标签
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-4">
            <div className="flex items-center gap-3 text-sm text-[rgb(var(--ink-muted-rgb))]">
              <Award className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
              <span>{friend.customAreaTitle || "等待命名"}</span>
              <span className="ml-auto text-xs uppercase tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">
                {friend.customAreaHighlight || ""}
              </span>
              {canEditProfile && !editingStory && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-3 py-1 text-[11px] text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                  onClick={() => {
                    setStoryDraft(friend.story ?? "");
                    setCustomTitleDraft(friend.customAreaTitle ?? "");
                    setCustomHighlightDraft(friend.customAreaHighlight ?? "");
                    setEditingStory(true);
                  }}
                >
                  编辑
                </Button>
              )}
            </div>
            {editingStory ? (
              <div className="mt-3 space-y-3">
                <Textarea
                  value={storyDraft}
                  onChange={(event) => setStoryDraft(event.target.value)}
                  placeholder="写下想展示的记忆"
                  className="min-h-[120px] rounded-2xl text-sm"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={customTitleDraft}
                    onChange={(event) => setCustomTitleDraft(event.target.value)}
                    placeholder="自定义标题"
                    className="rounded-2xl text-sm"
                  />
                  <Input
                    value={customHighlightDraft}
                    onChange={(event) => setCustomHighlightDraft(event.target.value)}
                    placeholder="亮点注记"
                    className="rounded-2xl text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                    onClick={() => {
                      setEditingStory(false);
                      setStoryDraft(friend.story ?? "");
                      setCustomTitleDraft(friend.customAreaTitle ?? "");
                      setCustomHighlightDraft(friend.customAreaHighlight ?? "");
                    }}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={handleStorySave}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-7 text-foreground">{friend.story || "尚未分享故事"}</p>
            )}
          </div>

          {canEditProfile && (
            <div className="rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-soft-rgb)/0.84)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">
                  <Palette className="h-4 w-4 text-[rgb(var(--accent-coral-rgb))]" />
                  主题预设
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full px-3 text-[11px] text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                  onClick={() => onUpdateTheme(friend.id, null, null)}
                >
                  恢复默认纸色
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {themePresets.map((preset) => {
                  const active = friend.accent === preset.accent && friend.neon === preset.neon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={cn(
                        "relative overflow-hidden rounded-2xl border-2 p-3 text-left transition",
                        active
                          ? "border-[rgb(var(--accent-coral-rgb)/0.35)] bg-[rgb(var(--accent-rose-rgb)/0.12)] shadow-sm"
                          : "border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.82)] hover:border-[rgb(var(--ink-rgb)/0.2)]"
                      )}
                      onClick={() => onUpdateTheme(friend.id, preset.accent, preset.neon)}
                      disabled={active}
                    >
                      <div className={cn("h-12 w-full rounded-xl bg-gradient-to-r", preset.accent)} />
                      <p className="mt-3 text-sm font-semibold text-foreground">{preset.label}</p>
                      <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">{preset.description}</p>
                      {active ? (
                        <span className="absolute right-3 top-3 text-[11px] text-[rgb(var(--accent-coral-rgb))]">已启用</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
function StatPill({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.82)] px-4 py-3 text-sm text-[rgb(var(--ink-muted-rgb))]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--accent-butter-rgb)/0.22)] text-foreground">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--ink-muted-rgb))]">{label}</p>
        <p className="text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-[rgb(var(--accent-coral-rgb))]">
      <path d="M4 4h16c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-5l-4.29 4.29c-.63.63-1.71.18-1.71-.71V17H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-current">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}
