import { Database } from "@/types/database";
import { PortalCard } from "@/data/mock";
import { FriendEntry } from "@/data/friends";

// 类型定义
export type DbCard = Database["public"]["Tables"]["cards"]["Row"];
export type MediaItem = { id: string; url: string; position: number };
export type DbJournalPost = Database["public"]["Tables"]["journal_posts"]["Row"] & {
  author?: { id: string; username: string; display_name: string; avatar_url: string | null; signature?: string | null };
  media?: MediaItem[];
  likes?: { count: number; user_ids: string[] };
  comments?: DbComment[];
  comments_count?: number;
};
export type DbComment = Database["public"]["Tables"]["journal_comments"]["Row"] & {
  author?: { id: string; username: string; display_name: string; avatar_url: string | null; signature?: string | null };
  targetUser?: { id: string; username: string; display_name: string; avatar_url: string | null; signature?: string | null } | null;
  parentId?: string | null;
  replies?: DbComment[];
};
export type DbRegistrationRequest = Database["public"]["Tables"]["registration_requests"]["Row"] & {
  user?: { username: string; display_name: string; avatar_url: string };
};

// UI 配置映射 (用于补充数据库中缺失的 UI 装饰字段)
const CARD_UI_CONFIG: Record<string, Partial<PortalCard>> = {
  "life-journal": {
    accent: "from-cyan-400/70 via-blue-500/50 to-fuchsia-500/50",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.45)]",
    badge: "alpha",
  },
  "friends": {
    accent: "from-rose-400/70 via-orange-500/60 to-amber-400/50",
    glow: "shadow-[0_0_40px_rgba(251,113,133,0.35)]",
  },
  "playground": {
    accent: "from-emerald-400/70 via-teal-500/60 to-cyan-400/50",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.45)]",
  },
  "approvals": {
    accent: "from-purple-400/70 via-indigo-500/60 to-blue-500/40",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.45)]",
  },
  "system-settings": {
    accent: "from-slate-300/50 via-slate-500/40 to-slate-800/40",
    glow: "shadow-[0_0_40px_rgba(148,163,184,0.35)]",
  },
  "stack": {
    accent: "from-sky-400/70 via-blue-500/50 to-cyan-500/50",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
  },
};

// 通用 Fetch 封装
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers ?? {});
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
  }

  // 处理 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// --- Cards API ---

export async function fetchCards(): Promise<PortalCard[]> {
  const res = await apiFetch<{ items: DbCard[] }>("/api/system/cards");
  const dbCards = res.items ?? [];
  
  return dbCards.map((card) => {
    const uiConfig = CARD_UI_CONFIG[card.slug] ?? {
      accent: "from-gray-400/70 via-gray-500/50 to-gray-600/50",
      glow: "shadow-[0_0_40px_rgba(156,163,175,0.45)]",
    };

    return {
      id: card.slug, // 使用 slug 作为前端 ID
      title: card.title,
      description: card.description,
      type: "internal", // 默认为 internal
      adminOnly: card.is_admin_only,
      metrics: [], // 数据库暂无 metrics，留空或后续实现
      ...uiConfig,
    } as PortalCard;
  });
}

export async function createCard(payload: {
  slug: string;
  title: string;
  description: string;
  is_admin_only?: boolean;
  order_index?: number;
  authorId: string; // 鉴权用
}) {
  return apiFetch<DbCard>("/api/system/cards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCard(
  slug: string, 
  payload: Partial<Omit<DbCard, "id" | "created_at" | "updated_at">> & { authorId: string }
) {
  // 注意：这里假设 API 支持通过 slug 更新，或者我们需要先获取 ID。
  // 根据文档 "PATCH /api/system/cards(... )"，通常 RESTful 是 /api/system/cards/:id
  // 但为了方便，如果后端支持 slug 查询最好。如果必须用 ID，前端可能需要先 fetchCards 拿到 ID。
  // 暂时假设后端能处理，或者我们在调用前会拿到 ID。
  // 修正：根据通常实践，我们可能需要传 ID。但在 fetchCards 中我们把 slug 映射为了 id。
  // 如果后端 API 路由是 [cardId]，那我们需要传真实的 UUID。
  // 鉴于 fetchCards 返回了 slug 作为 id，我们可能需要调整 fetchCards 返回真实 ID，或者 API 支持 slug。
  // 假设 API 路由是 /api/system/cards，通过 body 传 id 或 slug 识别？
  // 文档：PATCH /api/system/cards(...)，未明确路径参数。
  // 假设是 /api/system/cards，body 里带 id。
  return apiFetch<DbCard>("/api/system/cards", {
    method: "PATCH",
    body: JSON.stringify({ ...payload, slug }), // 确保 slug 传回去用于定位，或者 payload 里包含 id
  });
}

export async function deleteCard(slug: string, authorId: string) {
  return apiFetch("/api/system/cards", {
    method: "DELETE",
    body: JSON.stringify({ slug, authorId }),
  });
}

// --- Journal API ---

export async function fetchJournal(params: { limit?: number; cursor?: string }) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.cursor) searchParams.set("cursor", params.cursor);

  return apiFetch<{ items: DbJournalPost[]; nextCursor?: string }>(
    `/api/journal/posts?${searchParams.toString()}`
  );
}

export async function createJournal(payload: {
  authorId: string;
  content: string;
  title?: string;
  mediaUrls?: string[];
  visibility?: "public" | "private";
}) {
  return apiFetch<DbJournalPost>("/api/journal/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateJournal(
  postId: string,
  payload: { authorId: string } & Partial<Omit<DbJournalPost, "id" | "author_id">>
) {
  return apiFetch<DbJournalPost>(`/api/journal/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteJournal(postId: string, payload: { authorId: string }) {
  return apiFetch(`/api/journal/posts/${postId}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

// --- Likes API ---

export async function likeJournal(postId: string, userId: string) {
  return apiFetch<{ liked: boolean; total: number }>(`/api/journal/posts/${postId}/likes`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function unlikeJournal(postId: string, userId: string) {
  return apiFetch<{ liked: boolean; total: number }>(`/api/journal/posts/${postId}/likes`, {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
}

// --- Comments API ---

export async function fetchComments(postId: string) {
  const res = await apiFetch<{ comments: DbComment[] }>(`/api/journal/posts/${postId}/comments`);
  return res.comments ?? [];
}

export async function createComment(
  postId: string,
  payload: {
    authorId: string;
    content: string;
    parentCommentId?: string;
    targetUserId?: string;
  }
) {
  return apiFetch<DbComment>(`/api/journal/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteComment(
  postId: string,
  commentId: string,
  payload: { actorId: string; actorRole?: string }
) {
  return apiFetch(`/api/journal/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

// --- Media Upload API ---

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<{ url: string }>("/api/media/upload", {
    method: "POST",
    body: formData,
  });
}

// --- Approvals API ---

export async function fetchApprovals(params: { status?: "pending" | "approved" | "rejected"; limit?: number } = { status: "pending" }) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const res = await apiFetch<{ items?: DbRegistrationRequest[] }>(
    `/api/system/approvals?${searchParams.toString()}`
  );
  return res.items ?? [];
}

export async function reviewApproval(
  requestId: string,
  payload: {
    reviewerId: string;
    action: "approve" | "reject";
    rejectionReason?: string;
  }
) {
  return apiFetch<DbRegistrationRequest>(`/api/system/approvals/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// --- Profile API ---

export async function updateProfile(payload: {
  userId: string;
  displayName?: string;
  signature?: string;
  avatarUrl?: string;
}) {
  return apiFetch<{
    id: string;
    username: string;
    display_name: string;
    role: number;
    avatar_url: string | null;
    signature: string | null;
  }>("/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// --- Friends API ---

export async function fetchFriends(params: { viewerId?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.viewerId) {
    searchParams.set("viewerId", params.viewerId);
  }
  const query = searchParams.toString();
  const res = await apiFetch<{ items: FriendEntry[] }>(
    `/api/friends${query ? `?${query}` : ""}`
  );
  return res.items ?? [];
}

export async function updateFriend(
  friendId: string,
  payload: {
    alias?: string | null;
    isAdmin?: boolean;
    location?: string | null;
    story?: string | null;
    customAreaTitle?: string | null;
    customAreaHighlight?: string | null;
    accentClass?: string | null;
    neonClass?: string | null;
    signature?: string | null;
    actorRole: number;
    viewerId?: string;
  }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function addFriendTagApi(
  friendId: string,
  payload: { label: string; authorId: string; viewerId?: string }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}/tags`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleFriendTagLikeApi(
  friendId: string,
  tagId: string,
  payload: { userId: string; viewerId?: string }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}/tags/${tagId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "toggle-like", ...payload }),
  });
}

export async function removeFriendTagApi(
  friendId: string,
  tagId: string,
  payload: { actorRole: number; viewerId?: string }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}/tags/${tagId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "remove", ...payload }),
  });
}

export async function addFriendBadgeApi(
  friendId: string,
  payload: { label: string; colorClass: string; actorRole: number; viewerId?: string }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}/badges`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeFriendBadgeApi(
  friendId: string,
  badgeId: string,
  payload: { actorRole: number; viewerId?: string }
) {
  return apiFetch<FriendEntry>(`/api/friends/${friendId}/badges/${badgeId}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}
