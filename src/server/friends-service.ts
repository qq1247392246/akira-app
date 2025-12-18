import { getSupabaseAdmin } from "@/lib/supabase";
import type { FriendEntry, FriendTag, FriendBadge } from "@/data/friends";

type ProfileRow = {
  user_id: string;
  alias: string | null;
  location: string | null;
  accent_class: string | null;
  neon_class: string | null;
  story: string | null;
  custom_area_title: string | null;
  custom_area_highlight: string | null;
  is_admin: boolean | null;
  activity_score: number | null;
  comments: number | null;
  streak: number | null;
  orbit_label: string | null;
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  signature: string | null;
  role: number;
  is_active: boolean;
  created_at: string;
};

type FriendProfileUpdatePayload = {
  alias?: string | null;
  isAdmin?: boolean | null;
  location?: string | null;
  story?: string | null;
  customAreaTitle?: string | null;
  customAreaHighlight?: string | null;
  accentClass?: string | null;
  neonClass?: string | null;
  signature?: string | null;
};

const ACCENT_PALETTE = [
  {
    accent: "from-indigo-500/30 via-blue-500/20 to-purple-500/30",
    neon: "shadow-[0_0_32px_rgba(99,102,241,0.35)]",
  },
  {
    accent: "from-rose-400/30 via-orange-300/30 to-amber-200/30",
    neon: "shadow-[0_0_30px_rgba(251,113,133,0.4)]",
  },
  {
    accent: "from-teal-400/30 via-cyan-400/30 to-blue-400/30",
    neon: "shadow-[0_0_30px_rgba(45,212,191,0.4)]",
  },
  {
    accent: "from-fuchsia-500/30 via-purple-400/30 to-blue-400/30",
    neon: "shadow-[0_0_30px_rgba(217,70,239,0.35)]",
  },
  {
    accent: "from-amber-300/20 via-yellow-200/30 to-orange-400/30",
    neon: "shadow-[0_0_26px_rgba(251,191,36,0.4)]",
  },
];

export async function fetchFriendsFromDb(viewerId?: string, userId?: string): Promise<FriendEntry[]> {
  const supabase = getSupabaseAdmin();
  let userQuery = supabase
    .from("users")
    .select("id, username, display_name, avatar_url, signature, role, is_active, created_at")
    .eq("is_active", true);

  if (userId) {
    userQuery = userQuery.eq("id", userId);
  }

  const { data: users, error: userError } = await userQuery;
  if (userError) {
    throw new Error(`加载用户列表失败：${userError.message}`);
  }
  if (!users || users.length === 0) {
    return [];
  }

  const userIds = users.map((user) => user.id);
  let profiles = await fetchProfiles(userIds);
  const existingProfileIds = new Set(profiles.map((profile) => profile.user_id));
  const missingUsers = users.filter((user) => !existingProfileIds.has(user.id));

  if (missingUsers.length > 0) {
    await createDefaultProfiles(missingUsers);
    profiles = await fetchProfiles(userIds);
  }

  const {
    postsCountMap,
    likesMap,
    commentsCountMap,
    activityDayMap,
  } = await collectEngagementStats(userIds);

  const [badges, tags] = await Promise.all([fetchBadges(userIds), fetchTags(userIds)]);
  const badgesMap = badges.reduce<Record<string, FriendBadge[]>>((acc, badge) => {
    acc[badge.userId] = acc[badge.userId] || [];
    acc[badge.userId].push({ id: badge.id, label: badge.label, color: badge.color });
    return acc;
  }, {});

  const tagsMap = tags.reduce<Record<string, FriendTag[]>>((acc, tag) => {
    acc[tag.userId] = acc[tag.userId] || [];
    acc[tag.userId].push({
      id: tag.id,
      label: tag.label,
      likes: tag.likes,
      createdBy: tag.createdBy,
      createdAt: tag.createdAt,
      likedByMe: viewerId ? tag.likedBy?.has(viewerId) ?? false : false,
    });
    return acc;
  }, {});

  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return users
    .map((user, index) => {
      const profile = profileMap.get(user.id);
      const friendTags = (tagsMap[user.id] ?? []).sort(
        (a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt)
      );
      const likesSum = likesMap.get(user.id) ?? 0;
      const postCount = postsCountMap.get(user.id) ?? 0;
      const commentCount = commentsCountMap.get(user.id) ?? 0;
      const activityDays = activityDayMap.get(user.id) ?? 0;
      const companionshipDays = computeCompanionshipDays(user.created_at);
      const badgesList = badgesMap[user.id] ?? [];
      const palette = pickAccent(user.id, index);
      const activityScore =
        computeActivityScore({
          posts: postCount,
          comments: commentCount,
          likes: likesSum,
          activityDays,
        }) ?? profile?.activity_score ?? defaultScore(user.id);

      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        alias: profile?.alias ?? user.display_name,
        isAdmin: profile?.is_admin ?? (user.role === 1),
        avatarUrl: user.avatar_url ?? "",
        signature: user.signature ?? "",
        location: profile?.location ?? "",
        badges: badgesList,
        stats: {
          activityScore,
          likes: likesSum,
          comments: postCount + commentCount,
          tags: friendTags.length,
          orbit: profile?.orbit_label ?? defaultOrbitLabel(user.id),
          companionshipDays,
        },
        accent: profile?.accent_class ?? palette.accent,
        neon: profile?.neon_class ?? palette.neon,
        tags: friendTags,
        story: profile?.story ?? "",
        customAreaTitle: profile?.custom_area_title ?? "待补完",
        customAreaHighlight: profile?.custom_area_highlight ?? "",
      } satisfies FriendEntry;
    })
    .sort((a, b) => b.stats.activityScore - a.stats.activityScore);
}

export async function updateFriendProfile(
  friendId: string,
  payload: FriendProfileUpdatePayload
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const profileUpdates: Record<string, unknown> = {};
  const userUpdates: Record<string, unknown> = {};
  if (typeof payload.alias !== "undefined") {
    profileUpdates.alias = payload.alias;
  }
  if (typeof payload.isAdmin !== "undefined" && payload.isAdmin !== null) {
    profileUpdates.is_admin = payload.isAdmin;
  }
  if (typeof payload.location !== "undefined") {
    profileUpdates.location = payload.location;
  }
  if (typeof payload.story !== "undefined") {
    profileUpdates.story = payload.story;
  }
  if (typeof payload.customAreaTitle !== "undefined") {
    profileUpdates.custom_area_title = payload.customAreaTitle;
  }
  if (typeof payload.customAreaHighlight !== "undefined") {
    profileUpdates.custom_area_highlight = payload.customAreaHighlight;
  }
  if (typeof payload.accentClass !== "undefined") {
    profileUpdates.accent_class = payload.accentClass;
  }
  if (typeof payload.neonClass !== "undefined") {
    profileUpdates.neon_class = payload.neonClass;
  }
  if (typeof payload.signature !== "undefined") {
    userUpdates.signature = payload.signature;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase.from("friend_profiles").update(profileUpdates).eq("user_id", friendId);
    if (error) {
      throw new Error(`更新朋友资料失败：${error.message}`);
    }
  }

  if (Object.keys(userUpdates).length > 0) {
    const { error } = await supabase.from("users").update(userUpdates).eq("id", friendId);
    if (error) {
      throw new Error(`更新用户签名失败：${error.message}`);
    }
  }
}

export async function addFriendTag(
  friendId: string,
  label: string,
  authorId: string,
  viewerId?: string
): Promise<FriendEntry | null> {
  const supabase = getSupabaseAdmin();
  await assertFriendExists(friendId);
  const normalized = label.trim();
  if (!normalized) {
    throw new Error("标签内容不能为空");
  }
  const { data: inserted, error } = await supabase
    .from("user_tags")
    .insert({
      target_user_id: friendId,
      created_by: authorId,
      label: normalized,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`新增标签失败：${error.message}`);
  }
  await supabase
    .from("user_tag_likes")
    .upsert({ tag_id: inserted.id, user_id: authorId }, { onConflict: "tag_id,user_id" });
  const [friend] = await fetchFriendsFromDb(viewerId, friendId);
  return friend ?? null;
}

export async function toggleFriendTagLike(
  friendId: string,
  tagId: string,
  userId: string,
  viewerId?: string
): Promise<FriendEntry | null> {
  const supabase = getSupabaseAdmin();
  const tagOwner = await fetchTagOwner(tagId);
  if (!tagOwner || tagOwner !== friendId) {
    throw new Error("标签不存在或不属于该用户");
  }
  const { error: stateError } = await supabase
    .from("user_tag_likes")
    .upsert({ tag_id: tagId, user_id: userId }, { onConflict: "tag_id,user_id" });
  if (stateError) {
    throw new Error(`记录点赞状态失败：${stateError.message}`);
  }
  const { error: eventError } = await supabase
    .from("user_tag_like_events")
    .insert({ tag_id: tagId, user_id: userId });
  if (eventError) {
    throw new Error(`记录标签点赞失败：${eventError.message}`);
  }
  const [friend] = await fetchFriendsFromDb(viewerId, friendId);
  return friend ?? null;
}

export async function removeFriendTag(
  friendId: string,
  tagId: string,
  viewerId?: string
): Promise<FriendEntry | null> {
  const supabase = getSupabaseAdmin();
  const tagOwner = await fetchTagOwner(tagId);
  if (!tagOwner || tagOwner !== friendId) {
    throw new Error("标签不存在或不属于该用户");
  }
  await supabase.from("user_tags").delete().eq("id", tagId);
  const [friend] = await fetchFriendsFromDb(viewerId, friendId);
  return friend ?? null;
}

export async function addFriendBadge(
  friendId: string,
  payload: { label: string; colorClass: string },
  viewerId?: string
): Promise<FriendEntry | null> {
  const supabase = getSupabaseAdmin();
  await assertFriendExists(friendId);
  const cleanLabel = payload.label.trim();
  if (!cleanLabel) {
    throw new Error("徽章名称不能为空");
  }
  const { error } = await supabase.from("friend_badges").insert({
    user_id: friendId,
    label: cleanLabel,
    color_class: payload.colorClass,
  });
  if (error) {
    throw new Error(`新增徽章失败：${error.message}`);
  }
  const [friend] = await fetchFriendsFromDb(viewerId, friendId);
  return friend ?? null;
}

export async function removeFriendBadge(
  friendId: string,
  badgeId: string,
  viewerId?: string
): Promise<FriendEntry | null> {
  const supabase = getSupabaseAdmin();
  await assertFriendExists(friendId);
  const { error } = await supabase
    .from("friend_badges")
    .delete()
    .eq("id", badgeId)
    .eq("user_id", friendId);
  if (error) {
    throw new Error(`删除徽章失败：${error.message}`);
  }
  const [friend] = await fetchFriendsFromDb(viewerId, friendId);
  return friend ?? null;
}

type PostWithLikesRow = {
  id: string;
  author_id: string;
  journal_likes: Array<{ count: number | null }> | null;
};

type ActivityRow = {
  user_id: string;
  activity_date: string;
};

async function collectEngagementStats(userIds: string[]) {
  const empty = {
    postsCountMap: new Map<string, number>(),
    likesMap: new Map<string, number>(),
    commentsCountMap: new Map<string, number>(),
    activityDayMap: new Map<string, number>(),
  };
  if (userIds.length === 0) {
    return empty;
  }
  const supabase = getSupabaseAdmin();
  const [postsResult, commentsResult, activityResult] = await Promise.all([
    supabase
      .from("journal_posts")
      .select("id, author_id, journal_likes(count)")
      .in("author_id", userIds),
    supabase
      .from("journal_comments")
      .select("author_id")
      .in("author_id", userIds),
    supabase
      .from("user_daily_activity")
      .select("user_id, activity_date")
      .in("user_id", userIds),
  ]);
  if (postsResult.error) {
    throw new Error(`加载动态信息失败：${postsResult.error.message}`);
  }
  if (commentsResult.error) {
    throw new Error(`加载评论信息失败：${commentsResult.error.message}`);
  }
  if (activityResult.error) {
    throw new Error(`加载登录活跃信息失败：${activityResult.error.message}`);
  }

  const postsCountMap = new Map<string, number>();
  const likesMap = new Map<string, number>();
  (postsResult.data as PostWithLikesRow[] | null)?.forEach((post) => {
    postsCountMap.set(post.author_id, (postsCountMap.get(post.author_id) ?? 0) + 1);
    const likeCount = post.journal_likes?.[0]?.count ?? 0;
    likesMap.set(post.author_id, (likesMap.get(post.author_id) ?? 0) + (likeCount ?? 0));
  });

  const commentsCountMap = new Map<string, number>();
  (commentsResult.data ?? []).forEach((row) => {
    commentsCountMap.set(row.author_id, (commentsCountMap.get(row.author_id) ?? 0) + 1);
  });

  const activityDayMap = new Map<string, number>();
  const groupedDates = new Map<string, Set<string>>();
  (activityResult.data as ActivityRow[] | null)?.forEach((row) => {
    const normalized = normalizeDateString(row.activity_date);
    if (!groupedDates.has(row.user_id)) {
      groupedDates.set(row.user_id, new Set());
    }
    groupedDates.get(row.user_id)!.add(normalized);
  });
  groupedDates.forEach((dates, userId) => {
    const uniqueDates = Array.from(dates);
    activityDayMap.set(userId, uniqueDates.length);
  });

  return { postsCountMap, likesMap, commentsCountMap, activityDayMap };
}

async function fetchBadges(
  userIds: string[]
): Promise<Array<{ id: string; userId: string; label: string; color: string }>> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("friend_badges")
    .select("id, user_id, label, color_class")
    .in("user_id", userIds);
  if (error) {
    throw new Error(`加载徽章失败：${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    color: row.color_class,
  }));
}

async function fetchTags(
  userIds: string[]
): Promise<Array<{ userId: string; id: string; label: string; likes: number; createdBy: string; createdAt: string; likedBy?: Set<string> }>> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data: tagRows, error: tagError } = await supabase
    .from("user_tags")
    .select("id, label, target_user_id, created_at, created_by")
    .in("target_user_id", userIds);
  if (tagError) {
    throw new Error(`加载标签失败：${tagError.message}`);
  }
  const tagIds = tagRows?.map((row) => row.id) ?? [];
  const creatorIds = Array.from(new Set(tagRows?.map((row) => row.created_by).filter(Boolean) ?? []));

  const [creatorMap, likesMap] = await Promise.all([
    fetchDisplayNames(creatorIds),
    fetchTagLikes(tagIds),
  ]);

  return (tagRows ?? []).map((row) => {
    const stats = likesMap.get(row.id);
    const likedBy = stats?.likedBy ?? new Set<string>();
    const likes = stats?.count ?? 0;
    return {
      userId: row.target_user_id,
      id: row.id,
      label: row.label,
      likes,
      createdBy: creatorMap.get(row.created_by) ?? "匿名用户",
      createdAt: row.created_at,
      likedBy,
    };
  });
}

async function fetchDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name")
    .in("id", userIds);
  if (error) {
    throw new Error(`加载用户昵称失败：${error.message}`);
  }
  return new Map((data ?? []).map((row) => [row.id, row.display_name]));
}

type TagLikeStats = { count: number; likedBy: Set<string> };

async function fetchTagLikes(tagIds: string[]): Promise<Map<string, TagLikeStats>> {
  const map = new Map<string, TagLikeStats>();
  if (tagIds.length === 0) return map;
  const supabase = getSupabaseAdmin();
  const [{ data: eventRows, error: eventError }, { data: stateRows, error: stateError }] = await Promise.all([
    supabase
      .from("user_tag_like_events")
      .select("tag_id, user_id")
      .in("tag_id", tagIds),
    supabase
      .from("user_tag_likes")
      .select("tag_id, user_id")
      .in("tag_id", tagIds),
  ]);
  if (eventError) {
    throw new Error(`加载标签点赞记录失败：${eventError.message}`);
  }
  if (stateError) {
    throw new Error(`加载标签点赞状态失败：${stateError.message}`);
  }
  for (const row of eventRows ?? []) {
    if (!map.has(row.tag_id)) {
      map.set(row.tag_id, { count: 0, likedBy: new Set<string>() });
    }
    map.get(row.tag_id)!.count += 1;
  }
  for (const row of stateRows ?? []) {
    if (!map.has(row.tag_id)) {
      map.set(row.tag_id, { count: 0, likedBy: new Set<string>() });
    }
    map.get(row.tag_id)!.likedBy.add(row.user_id);
  }
  return map;
}

async function assertFriendExists(friendId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("friend_profiles")
    .select("user_id")
    .eq("user_id", friendId)
    .maybeSingle();
  if (error) {
    throw new Error(`查询朋友资料失败：${error.message}`);
  }
  if (!data) {
    throw new Error("朋友资料不存在");
  }
}

async function fetchTagOwner(tagId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_tags")
    .select("target_user_id")
    .eq("id", tagId)
    .maybeSingle();
  if (error) {
    throw new Error(`查询标签归属失败：${error.message}`);
  }
  return data?.target_user_id ?? null;
}
async function fetchProfiles(userIds: string[]): Promise<ProfileRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("friend_profiles")
    .select(
      "user_id, alias, location, accent_class, neon_class, story, custom_area_title, custom_area_highlight, is_admin, activity_score, comments, streak, orbit_label"
    )
    .in("user_id", userIds);
  if (error) {
    throw new Error(`加载朋友资料失败：${error.message}`);
  }
  return data ?? [];
}

async function createDefaultProfiles(users: UserRow[]): Promise<void> {
  if (users.length === 0) return;
  const supabase = getSupabaseAdmin();
  const rows = users.map((user, index) => {
    const palette = pickAccent(user.id, index);
    return {
      user_id: user.id,
      alias: user.display_name,
      location: "",
      accent_class: palette.accent,
      neon_class: palette.neon,
      story: "",
      custom_area_title: "待补完",
      custom_area_highlight: "",
      is_admin: user.role === 1,
      activity_score: defaultScore(user.id),
      comments: 0,
      streak: 0,
      orbit_label: defaultOrbitLabel(user.id),
    };
  });
  const { error } = await supabase.from("friend_profiles").upsert(rows, { onConflict: "user_id" });
  if (error) {
    throw new Error(`初始化朋友资料失败：${error.message}`);
  }
}

function pickAccent(seed: string, fallbackIndex: number) {
  const hash = hashString(seed) + fallbackIndex;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function computeActivityScore({
  posts,
  comments,
  likes,
  activityDays,
}: {
  posts: number;
  comments: number;
  likes: number;
  activityDays: number;
}): number {
  const weighted =
    posts * 6 +
    comments * 4 +
    likes * 2 +
    activityDays * 5;
  if (weighted <= 0) {
    return 0;
  }
  const normalized = Math.min(100, Math.round(Math.sqrt(weighted) * 5));
  return normalized;
}

function defaultScore(seed: string) {
  const hash = hashString(seed);
  return 60 + (hash % 40);
}

function defaultOrbitLabel(seed: string) {
  const hash = hashString(seed);
  return `DAY ${50 + (hash % 250)}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeCompanionshipDays(createdAt?: string | null): number {
  if (!createdAt) return 0;
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return 0;
  }
  const start = startOfUtcDay(createdDate);
  const today = startOfUtcDay(new Date());
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : 0;
}

function normalizeDateString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function computeCurrentStreak(dateStrings: string[]): number {
  if (!dateStrings.length) return 0;
  const normalizedSet = new Set(dateStrings.map(normalizeDateString));
  let streak = 0;
  let cursor = normalizeDateString(new Date().toISOString());
  while (normalizedSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }
  return streak;
}

function shiftDateString(dateString: string, offsetDays: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}
