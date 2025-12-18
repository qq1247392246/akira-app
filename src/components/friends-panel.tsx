"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "@/lib/api";
import {
  Award,
  Crown,
  Heart,
  Palette,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
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
};

const rankingModes: { id: RankingMetric; label: string; description: string }[] = [
  { id: "activity", label: "活跃度", description: "按最近 30 天互动热度排序" },
  { id: "likes", label: "好感值", description: "点赞总数 + 标签心意" },
  { id: "comments", label: "对话量", description: "动态、回复与评论合计" },
];

const themePresets = [
  {
    id: "aurora",
    label: "极光脉冲",
    accent: "from-indigo-500/40 via-blue-500/20 to-purple-500/30",
    neon: "shadow-[0_0_32px_rgba(99,102,241,0.35)]",
    description: "冷调紫色辉光",
  },
  {
    id: "ember",
    label: "余烬流",
    accent: "from-rose-400/30 via-orange-300/30 to-amber-200/30",
    neon: "shadow-[0_0_30px_rgba(251,113,133,0.4)]",
    description: "暖色夕阳渐层",
  },
  {
    id: "tidal",
    label: "潮汐绽放",
    accent: "from-teal-400/30 via-cyan-400/30 to-blue-400/30",
    neon: "shadow-[0_0_30px_rgba(45,212,191,0.4)]",
    description: "青绿海潮色调",
  },
  {
    id: "neon",
    label: "霓虹幻梦",
    accent: "from-fuchsia-500/30 via-purple-400/30 to-blue-400/30",
    neon: "shadow-[0_0_30px_rgba(217,70,239,0.35)]",
    description: "浓烈赛博混色",
  },
  {
    id: "solstice",
    label: "至日流光",
    accent: "from-amber-300/20 via-yellow-200/30 to-orange-400/30",
    neon: "shadow-[0_0_26px_rgba(251,191,36,0.4)]",
    description: "金色晨光配色",
  },
];

const badgeColorOptions = [
  { id: "starlight", label: "星光渐层", className: "from-cyan-400 via-blue-500 to-indigo-500" },
  { id: "ember", label: "余烬之焰", className: "from-amber-300 via-orange-400 to-rose-400" },
  { id: "flora", label: "花海微风", className: "from-emerald-300 via-teal-400 to-cyan-400" },
  { id: "nova", label: "新星浪潮", className: "from-fuchsia-400 via-pink-400 to-rose-500" },
  { id: "mono", label: "冷灰单色", className: "from-slate-200 via-slate-400 to-slate-600" },
];
export function FriendsPanel() {
  const { user: sessionUser } = useSession();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("activity");
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!q) return friends;
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
      if (!isAdmin) return;
      try {
        const updated = await updateFriend(friendId, {
          ...updates,
          actorRole: 1,
          viewerId,
        });
        replaceFriend(updated);
      } catch (err) {
        console.error("更新朋友资料失败", err);
      }
    },
    [isAdmin, replaceFriend, viewerId]
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
  return (
    <div className="space-y-8 text-white">
      <section className="rounded-[32px] border border-white/15 bg-gradient-to-br from-[#120c1f]/80 via-[#0c1824]/80 to-[#09111f]/80 p-6 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-bold">朋友能量仓</p>
            <h2 className="mt-2 text-3xl font-black drop-shadow-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              朋友轨道
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {canInteract
                ? "给朋友的标签点心、写外号，让我们的私密星图持续闪耀。"
                : "登录后即可添加标签、点亮互动或丰富他们的故事。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rankingModes.map((mode) => (
              <Button
                key={mode.id}
                onClick={() => setRankingMetric(mode.id)}
                className={cn(
                  "rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 shadow-sm transition hover:border-white/50 hover:text-white",
                  rankingMetric === mode.id && "bg-white/15 text-white border-white/50 shadow-lg"
                )}
                variant="ghost"
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索朋友、标签或徽章"
              className="h-11 rounded-full border-white/20 bg-white/5 pl-10 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            {searchQuery.trim()
              ? `已匹配 ${filteredFriends.length} / ${friends.length}`
              : `共 ${friends.length} 张好友卡`}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ranking.map((friend, index) => (
            <div
              key={friend.id}
              className={cn(
                "relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10",
                friend.neon
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white/80 shadow-inner">
                  #{index + 1}
                </div>
                <div>
                  <p className="text-lg font-semibold">{friend.displayName}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">{friend.stats.orbit}</p>
                </div>
                {index === 0 ? (
                  <Crown className="ml-auto h-6 w-6 text-amber-300 drop-shadow-lg" />
                ) : (
                  <Star className="ml-auto h-5 w-5 text-white/60" />
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-white/70">
                <span>{rankingModes.find((m) => m.id === rankingMetric)?.description}</span>
                <span className="text-lg font-bold text-white">
                  {rankingMetric === "activity"
                    ? friend.stats.activityScore
                    : rankingMetric === "likes"
                      ? friend.stats.likes
                      : friend.stats.comments}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
        {loading ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center text-white/50">
            正在加载朋友卡片…
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center text-white/40">
            还没有任何朋友数据
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center text-white/40">
            当前筛选没有匹配的卡片
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              canInteract={canInteract}
              canAdmin={isAdmin}
              onToggleTagLike={handleTagToggle}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onUpdateProfile={handleProfileUpdate}
              onAliasUpdate={handleAliasUpdate}
              onPromoteAdmin={handlePromoteAdmin}
              onAddBadge={handleAddBadge}
              onRemoveBadge={handleRemoveBadge}
              onUpdateTheme={handleThemeUpdate}
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
  onToggleTagLike,
  onAddTag,
  onRemoveTag,
  onUpdateProfile,
  onAliasUpdate,
  onPromoteAdmin,
  onAddBadge,
  onRemoveBadge,
  onUpdateTheme,
}: {
  friend: FriendEntry;
  canInteract: boolean;
  canAdmin: boolean;
  onToggleTagLike: (friendId: string, tagId: string) => void;
  onAddTag: (friendId: string, label: string) => void;
  onRemoveTag: (friendId: string, tagId: string) => void;
  onUpdateProfile: (friendId: string, updates: ProfileUpdates) => void;
  onAliasUpdate: (friendId: string, alias: string) => void;
  onPromoteAdmin: (friendId: string) => void;
  onAddBadge: (friendId: string, label: string, colorClass: string) => void;
  onRemoveBadge: (friendId: string, badgeId: string) => void;
  onUpdateTheme: (friendId: string, accentClass: string | null, neonClass: string | null) => void;
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

  const tagTotal = friend.tags.reduce((sum, tag) => sum + tag.likes, 0) || 1;

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

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-white/15 bg-white/5 p-6 backdrop-blur-xl shadow-2xl transition hover:border-white/30 hover:bg-white/10",
        friend.neon
      )}
    >
      <div className="absolute inset-0 opacity-30">
        <div className={cn("absolute inset-0 blur-[120px]", `bg-gradient-to-br ${friend.accent}`)} />
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:gap-10">
        <div className="flex flex-col items-center gap-3 text-center lg:w-48">
          <div className="relative">
            <Avatar className="h-32 w-32 border-2 border-white/40 shadow-xl">
              <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
              <AvatarFallback className="bg-slate-800 text-white/70">{friend.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            {friend.isAdmin && (
              <span className="absolute -right-2 bottom-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white shadow-lg">
                <Shield className="h-3 w-3" />
                管理员
              </span>
            )}
          </div>
          <div>
            <p className="text-xl font-black">{friend.displayName}</p>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-white/70">
              {editingAlias ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={aliasDraft}
                    onChange={(event) => setAliasDraft(event.target.value)}
                    className="h-8 w-40 rounded-full border-white/30 bg-white/5 text-center text-sm text-white focus-visible:ring-cyan-400/40"
                  />
                  <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleAliasSave}>
                    <CheckIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-white/60 hover:text-white"
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
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs uppercase tracking-[0.2em] text-fuchsia-200">
                    {friend.alias || "未设置称号"}
                  </span>
                  {canAdmin && (
                    <button
                      className="rounded-full border border-white/10 bg-white/5 p-1 text-white/50 transition hover:border-white/30 hover:text-white"
                      onClick={() => setEditingAlias(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              {editingLocation ? (
                <>
                  <Input
                    value={locationDraft}
                    onChange={(event) => setLocationDraft(event.target.value)}
                    className="h-8 w-40 rounded-full border-white/30 bg-white/5 text-center text-[10px] text-white focus-visible:ring-cyan-400/40"
                  />
                  <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleLocationSave}>
                    <CheckIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-white/60 hover:text-white"
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
                  {canAdmin && (
                    <button
                      className="rounded-full border border-white/10 bg-white/5 p-1 text-white/50 transition hover:border-white/30 hover:text-white"
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
                <div key={`${friend.id}-${badge.label}-${badge.id ?? "temp"}`} className="relative">
                  <Badge className={cn("border-none text-xs font-semibold text-white shadow-md", "bg-gradient-to-r", badge.color)}>
                    {badge.label}
                  </Badge>
                  {canAdmin && badge.id && (
                    <button
                      className="absolute -right-1 -top-1 rounded-full bg-black/70 p-1 text-white/60 hover:text-white"
                      onClick={() => onRemoveBadge(friend.id, badge.id as string)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canAdmin && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">徽章面板</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {badgeColorOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-full border-2 p-0.5",
                        selectedBadgeColor === option.className ? "border-white shadow-lg" : "border-transparent opacity-70"
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
                    placeholder="输入徽章名称"
                    className="h-9 flex-1 rounded-full border-white/20 bg-black/20 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                    maxLength={16}
                  />
                  <Button
                    size="sm"
                    className="rounded-full bg-cyan-500/80 px-4 text-xs text-white hover:bg-cyan-400"
                    onClick={handleAddBadgeClick}
                    disabled={!badgeLabelDraft.trim()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    添加
                  </Button>
                </div>
              </div>
            )}
          </div>

          {canAdmin &&
            (friend.isAdmin ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">已是管理员</span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full border border-white/20 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/15"
                onClick={() => onPromoteAdmin(friend.id)}
              >
                设为管理员
              </Button>
            ))}
        </div>
        <div className="flex-1 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-inner">
            <p className="text-sm text-white/70">{friend.signature}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <StatPill label="活跃度" value={friend.stats.activityScore} icon={<TrendingUp className="h-4 w-4" />} />
              <StatPill label="累计喜欢" value={friend.stats.likes} icon={<Heart className="h-4 w-4" />} />
              <StatPill label="交流次数" value={friend.stats.comments} icon={<MessageIcon />} />
              <StatPill label="连续活跃" value={`${friend.stats.streak} 天`} icon={<Sparkles className="h-4 w-4" />} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">标签星群</h3>
              {!canInteract && <p className="text-xs text-white/40">登录后可点赞或新增标签</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {friend.tags.map((tag) => {
                const ratio = Math.max(0.25, tag.likes / tagTotal);
                return (
                  <button
                    key={tag.id}
                    className={cn(
                      "group/tag relative flex items-center gap-2 rounded-2xl border border-white/15 bg-gradient-to-r from-white/10 to-white/5 px-4 py-2 text-sm shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                      tag.likedByMe ? "border-rose-300/60 text-white" : "text-white/70 hover:border-white/40 hover:text-white",
                      canInteract ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                    )}
                    style={{ flexGrow: ratio, minWidth: "120px" }}
                    onClick={() => canInteract && onToggleTagLike(friend.id, tag.id)}
                    type="button"
                  >
                    <span className="font-medium">{tag.label}</span>
                    <span className="flex items-center gap-1 text-xs text-white/70">
                      <Heart className={cn("h-3.5 w-3.5 transition", tag.likedByMe && "fill-current text-rose-400")} />
                      {tag.likes}
                    </span>
                    {canAdmin && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`移除标签 ${tag.label}`}
                        className="absolute -right-1 -top-1 rounded-full bg-black/50 p-1 text-white/40 opacity-0 transition group-hover/tag:opacity-100 hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveTag(friend.id, tag.id);
                        }}
                      >
                        <X className="h-3 w-3" />
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
                    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/30 bg-white/5 px-3 py-2">
                      <Input
                        value={tagDraft}
                        onChange={(event) => setTagDraft(event.target.value)}
                        placeholder="输入新的标签"
                        className="h-9 w-40 rounded-full border-none bg-transparent text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                        maxLength={16}
                      />
                      <Button size="icon" className="h-9 w-9 rounded-full bg-cyan-500/80 text-white hover:bg-cyan-400" onClick={handleAddTagClick}>
                        <CheckIcon />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full text-white/60 hover:text-white"
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
                      className="flex items-center gap-2 rounded-2xl border border-dashed border-white/30 bg-white/5 px-4 py-2 text-sm text-white/70 hover:border-white/60 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                      添加标签
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-4">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Award className="h-4 w-4 text-amber-300" />
              <span>{friend.customAreaTitle || "等待命名"}</span>
              <span className="ml-auto text-xs uppercase tracking-[0.3em] text-cyan-200">
                {friend.customAreaHighlight || ""}
              </span>
              {canAdmin && !editingStory && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-3 py-1 text-[11px] text-white/70 hover:text-white"
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
                  className="min-h-[120px] rounded-2xl border-white/30 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={customTitleDraft}
                    onChange={(event) => setCustomTitleDraft(event.target.value)}
                    placeholder="自定义标题"
                    className="rounded-2xl border-white/30 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                  />
                  <Input
                    value={customHighlightDraft}
                    onChange={(event) => setCustomHighlightDraft(event.target.value)}
                    placeholder="亮点注记"
                    className="rounded-2xl border-white/30 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white"
                    onClick={() => {
                      setEditingStory(false);
                      setStoryDraft(friend.story ?? "");
                      setCustomTitleDraft(friend.customAreaTitle ?? "");
                      setCustomHighlightDraft(friend.customAreaHighlight ?? "");
                    }}
                  >
                    取消
                  </Button>
                  <Button size="sm" className="bg-cyan-500/70 text-white hover:bg-cyan-400" onClick={handleStorySave}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/80">{friend.story || "尚未分享故事"}</p>
            )}
          </div>

          {canAdmin && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                  <Palette className="h-4 w-4 text-cyan-300" />
                  主题预设
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full px-3 text-[11px] text-white/60 hover:text-white"
                  onClick={() => onUpdateTheme(friend.id, null, null)}
                >
                  重置光晕
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
                        "relative overflow-hidden rounded-2xl border border-white/15 p-3 text-left",
                        active ? "border-cyan-300 bg-white/10 shadow-lg" : "bg-black/20 hover:border-white/40"
                      )}
                      onClick={() => onUpdateTheme(friend.id, preset.accent, preset.neon)}
                      disabled={active}
                    >
                      <div className={cn("h-12 w-full rounded-xl bg-gradient-to-r", preset.accent, preset.neon)} />
                      <p className="mt-3 text-sm font-semibold text-white">{preset.label}</p>
                      <p className="text-xs text-white/60">{preset.description}</p>
                      {active && <span className="absolute right-3 top-3 text-[11px] text-cyan-200">已启用</span>}
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
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{label}</p>
        <p className="text-base font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-cyan-200">
      <path d="M4 4h16c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-5l-4.29 4.29c-.63.63-1.71.18-1.71-.71V17H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-white">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}


