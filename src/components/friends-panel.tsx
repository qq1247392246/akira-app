"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type FriendEntry } from "@/data/friends";
import {
  addFriendTagApi,
  fetchFriends,
  removeFriendTagApi,
  toggleFriendTagLikeApi,
  updateFriend,
} from "@/lib/api";
import {
  Award,
  Crown,
  Heart,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react";

type RankingMetric = "activity" | "likes" | "comments";

const rankingModes: { id: RankingMetric; label: string; description: string }[] = [
  { id: "activity", label: "活跃度", description: "根据近 30 天内容与互动加权" },
  { id: "likes", label: "收获心动", description: "获得的点赞 + 标签点赞" },
  { id: "comments", label: "互动频率", description: "留言、语音与回复次数" },
];

export function FriendsPanel() {
  const { user: sessionUser } = useSession();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("activity");

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
      console.error("Failed to load friends", err);
      setError("无法加载朋友卡片，请稍后再试");
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

  const handleTagToggle = async (friendId: string, tagId: string) => {
    if (!canInteract || !sessionUser) return;
    try {
      const updated = await toggleFriendTagLikeApi(friendId, tagId, {
        userId: sessionUser.id,
        viewerId: viewerId ?? sessionUser.id,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("Failed to toggle tag like", err);
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
      console.error("Failed to add tag", err);
    }
  };

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    if (!isAdmin) return;
    try {
      const updated = await removeFriendTagApi(friendId, tagId, { actorRole: 1, viewerId });
      replaceFriend(updated);
    } catch (err) {
      console.error("Failed to remove tag", err);
    }
  };

  const handleAliasUpdate = async (friendId: string, nextAlias: string) => {
    if (!isAdmin) return;
    const normalized = nextAlias.trim();
    try {
      const updated = await updateFriend(friendId, {
        alias: normalized || null,
        actorRole: 1,
        viewerId,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("Failed to update alias", err);
    }
  };

  const handleToggleAdmin = async (friendId: string) => {
    if (!isAdmin) return;
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;
    try {
      const updated = await updateFriend(friendId, {
        isAdmin: !friend.isAdmin,
        actorRole: 1,
        viewerId,
      });
      replaceFriend(updated);
    } catch (err) {
      console.error("Failed to toggle admin", err);
    }
  };

  return (
    <div className="space-y-8 text-white">
      <section className="rounded-[32px] border border-white/15 bg-gradient-to-br from-[#120c1f]/80 via-[#0c1824]/80 to-[#09111f]/80 p-6 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-bold">Friends Capsule</p>
            <h2 className="mt-2 text-3xl font-black drop-shadow-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              友人星链
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {canInteract ? "对朋友的标签点赞、补充别名或心情记忆，共同维护这张私人星图。" : "登录后即可为朋友添加标签、点赞或补充故事。"}
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
            正在载入朋友卡片...
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center text-white/40">
            暂无朋友数据
          </div>
        ) : (
          friends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              canInteract={canInteract}
              canAdmin={isAdmin}
              onToggleTagLike={handleTagToggle}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onUpdateAlias={handleAliasUpdate}
              onToggleAdmin={handleToggleAdmin}
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
  onUpdateAlias,
  onToggleAdmin,
}: {
  friend: FriendEntry;
  canInteract: boolean;
  canAdmin: boolean;
  onToggleTagLike: (friendId: string, tagId: string) => void;
  onAddTag: (friendId: string, label: string) => void;
  onRemoveTag: (friendId: string, tagId: string) => void;
  onUpdateAlias: (friendId: string, alias: string) => void;
  onToggleAdmin: (friendId: string) => void;
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasDraft, setAliasDraft] = useState(friend.alias ?? "");

  useEffect(() => {
    setAliasDraft(friend.alias ?? "");
  }, [friend.alias]);

  const tagTotal = friend.tags.reduce((sum, tag) => sum + tag.likes, 0) || 1;

  const handleSubmitAlias = () => {
    onUpdateAlias(friend.id, aliasDraft);
    setEditingAlias(false);
  };

  const handleAddTagClick = () => {
    if (!tagDraft.trim()) return;
    onAddTag(friend.id, tagDraft);
    setTagDraft("");
    setAddingTag(false);
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
                MOD
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
                  <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleSubmitAlias}>
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
                    {friend.alias || "UNSET ALIAS"}
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
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">{friend.location}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {friend.badges.map((badge) => (
              <Badge
                key={`${friend.id}-${badge.label}`}
                className={cn(
                  "border-none text-xs font-semibold text-white shadow-md",
                  "bg-gradient-to-r",
                  badge.color
                )}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
          {canAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/15"
              onClick={() => onToggleAdmin(friend.id)}
            >
              {friend.isAdmin ? "降级为普通用户" : "设为管理员"}
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-inner">
            <p className="text-sm text-white/70">{friend.signature}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <StatPill label="活跃度" value={friend.stats.activityScore} icon={<TrendingUp className="h-4 w-4" />} />
              <StatPill label="被点赞" value={friend.stats.likes} icon={<Heart className="h-4 w-4" />} />
              <StatPill label="互动" value={friend.stats.comments} icon={<MessageIcon />} />
              <StatPill label="连击" value={`${friend.stats.streak} 天`} icon={<Sparkles className="h-4 w-4" />} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">标签星雨</h3>
              {!canInteract && <p className="text-xs text-white/40">登录以参与标签点赞或新增</p>}
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
                      <button
                        className="absolute -right-1 -top-1 rounded-full bg-black/50 p-1 text-white/40 opacity-0 transition group-hover/tag:opacity-100 hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveTag(friend.id, tag.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <span className="pointer-events-none absolute right-2 top-0 text-lg opacity-0 transition group-hover/tag:-translate-y-2 group-hover/tag:opacity-100">
                      ❤️
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
                        placeholder="写下一个新标签"
                        className="h-9 w-40 rounded-full border-none bg-transparent text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/40"
                        maxLength={16}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-full bg-cyan-500/80 text-white hover:bg-cyan-400"
                        onClick={handleAddTagClick}
                      >
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
                      新增标签
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-4">
            <div className="flex items-center justify-between text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-300" />
                <span>{friend.customAreaTitle}</span>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-200">{friend.customAreaHighlight}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{friend.story}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatPill({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
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
