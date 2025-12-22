import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type JournalMediaRow = Database["public"]["Tables"]["journal_media"]["Row"];
type JournalLikeRow = Database["public"]["Tables"]["journal_likes"]["Row"];
type JournalCommentRow = Database["public"]["Tables"]["journal_comments"]["Row"];

type PublicUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  signature: string | null;
};

type CommentNode = {
  id: string;
  content: string | null;
  createdAt: string;
  created_at: string;
  deletedAt: string | null;
  deleted_at: string | null;
  parentId: string | null;
  parent_comment_id: string | null;
  author: PublicUser | null;
  targetUser: PublicUser | null;
  authorId: string;
  author_id: string;
  replies?: CommentNode[];
};

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime().optional(),
});

const MAX_MEDIA_ITEMS = 9;

const createPostSchema = z.object({
  authorId: z.string().uuid(),
  title: z.string().max(120).optional(),
  content: z.string().min(1),
  visibility: z.enum(["public"]).optional(),
  mediaUrls: z.array(z.string().url()).max(MAX_MEDIA_ITEMS).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 10;
  const cursor = parsed.data.cursor ?? undefined;
  const supabase = getSupabaseAdmin();

  let postsQuery = supabase
    .from("journal_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    postsQuery = postsQuery.lt("created_at", cursor);
  }

  const { data: rawPosts, error: postsError } = await postsQuery;

  if (postsError) {
    console.error(postsError);
    return NextResponse.json({ error: "Failed to load journal posts" }, { status: 500 });
  }

  if (!rawPosts || rawPosts.length === 0) {
    return NextResponse.json({ items: [], hasMore: false, nextCursor: null });
  }

  const hasMore = rawPosts.length > limit;
  const posts = hasMore ? rawPosts.slice(0, limit) : rawPosts;
  const postIds = posts.map((post) => post.id);

  const [mediaRes, likesRes, commentsRes] = await Promise.all([
    postIds.length
      ? supabase
          .from("journal_media")
          .select("*")
          .in("post_id", postIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as JournalMediaRow[], error: null }),
    postIds.length
      ? supabase.from("journal_likes").select("*").in("post_id", postIds)
      : Promise.resolve({ data: [] as JournalLikeRow[], error: null }),
    postIds.length
      ? supabase
          .from("journal_comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as JournalCommentRow[], error: null }),
  ]);

  if (mediaRes.error || likesRes.error || commentsRes.error) {
    console.error(mediaRes.error ?? likesRes.error ?? commentsRes.error);
    return NextResponse.json({ error: "Failed to load journal relations" }, { status: 500 });
  }

  const userIds = new Set<string>();
  posts.forEach((post) => userIds.add(post.author_id));
  likesRes.data.forEach((like) => userIds.add(like.user_id));
  commentsRes.data.forEach((comment) => {
    userIds.add(comment.author_id);
    if (comment.target_user_id) {
      userIds.add(comment.target_user_id);
    }
  });

  const usersMap = await loadUsersMap(Array.from(userIds));
  const mediaMap = buildMediaMap(mediaRes.data ?? []);
  const likesMap = buildLikesMap(likesRes.data ?? []);
  const commentsMap = buildCommentsMap(commentsRes.data ?? []);

  const items = posts.map((post) => {
    const author = usersMap.get(post.author_id) ?? null;
    const mediaItems = mediaMap.get(post.id) ?? [];
    const likes = likesMap.get(post.id) ?? [];
    const postComments = commentsMap.get(post.id) ?? [];
    const commentTree = buildCommentTree(postComments, usersMap);

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      visibility: post.visibility,
      created_at: post.created_at,
      updated_at: post.updated_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author_id: post.author_id,
      author: author
        ? {
            id: author.id,
            username: author.username,
            display_name: author.display_name,
            avatar_url: author.avatar_url,
            signature: author.signature,
          }
        : null,
      media: mediaItems,
      likes: {
        count: likes.length,
        user_ids: likes,
      },
      comments: commentTree,
      comments_count: postComments.length,
    };
  });

  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;
  return NextResponse.json({ items, hasMore, nextCursor });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { authorId, title, content, mediaUrls, visibility } = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data: post, error } = await supabase
    .from("journal_posts")
    .insert({
      author_id: authorId,
      title: title ?? null,
      content,
      visibility: visibility ?? "public",
    })
    .select("*")
    .single();

  if (error || !post) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create journal" }, { status: 500 });
  }

  if (mediaUrls && mediaUrls.length > 0) {
    const payload = mediaUrls.map((url, index) => ({
      post_id: post.id,
      asset_url: url,
      position: index,
    }));

    const { error: mediaError } = await supabase.from("journal_media").insert(payload);

    if (mediaError) {
      console.error(mediaError);
      return NextResponse.json({ error: "Failed to save media" }, { status: 500 });
    }
  }

  const author = await loadUsersMap([authorId]).then((map) => map.get(authorId) ?? null);

  return NextResponse.json({
    id: post.id,
    title: post.title,
    content: post.content,
    visibility: post.visibility,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    author,
    likes: { count: 0, user_ids: [] },
    comments_count: 0,
    comments: [],
    author_id: post.author_id,
    created_at: post.created_at,
    updated_at: post.updated_at,
    media: (mediaUrls ?? []).map((url, index) => ({ id: `${post.id}-${index}`, url, position: index })),
  });
}

async function loadUsersMap(userIds: string[]): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  if (userIds.length === 0) {
    return map;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, username, display_name, avatar_url, signature")
    .in("id", userIds);

  if (error || !data) {
    console.error(error);
    return map;
  }

  data.forEach((user) => {
    map.set(user.id, {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      signature: user.signature,
    });
  });

  return map;
}

function buildMediaMap(rows: JournalMediaRow[]) {
  const map = new Map<string, { id: string; url: string; position: number }[]>();
  rows.forEach((media) => {
    const list = map.get(media.post_id) ?? [];
    list.push({ id: media.id, url: media.asset_url, position: media.position });
    map.set(media.post_id, list);
  });
  map.forEach((list, key) => {
    map.set(
      key,
      list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );
  });
  return map;
}

function buildLikesMap(rows: JournalLikeRow[]) {
  const map = new Map<string, string[]>();
  rows.forEach((like) => {
    const list = map.get(like.post_id) ?? [];
    list.push(like.user_id);
    map.set(like.post_id, list);
  });
  return map;
}

function buildCommentsMap(rows: JournalCommentRow[]) {
  const map = new Map<string, JournalCommentRow[]>();
  rows.forEach((comment) => {
    const list = map.get(comment.post_id) ?? [];
    list.push(comment);
    map.set(comment.post_id, list);
  });
  return map;
}

function buildCommentTree(comments: JournalCommentRow[], usersMap: Map<string, PublicUser>) {
  const topLevel: CommentNode[] = [];
  const repliesMap = new Map<string, CommentNode[]>();

  comments.forEach((comment) => {
    const item: CommentNode = {
      id: comment.id,
      content: comment.deleted_at ? null : comment.content,
      createdAt: comment.created_at,
      created_at: comment.created_at,
      deletedAt: comment.deleted_at,
      deleted_at: comment.deleted_at,
      parentId: comment.parent_comment_id,
      parent_comment_id: comment.parent_comment_id,
      author: usersMap.get(comment.author_id) ?? null,
      targetUser: comment.target_user_id ? usersMap.get(comment.target_user_id) ?? null : null,
      authorId: comment.author_id,
      author_id: comment.author_id,
    };

    if (!comment.parent_comment_id) {
      topLevel.push(item);
    } else {
      const siblings = repliesMap.get(comment.parent_comment_id) ?? [];
      siblings.push(item);
      repliesMap.set(comment.parent_comment_id, siblings);
    }
  });

  return topLevel.map((comment) => ({
    ...comment,
    replies: repliesMap.get(comment.id) ?? [],
  }));
}
