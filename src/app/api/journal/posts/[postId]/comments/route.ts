import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type JournalCommentRow = Database["public"]["Tables"]["journal_comments"]["Row"];

type CommentNode = {
  id: string;
  content: string | null;
  createdAt: string;
  deletedAt: string | null;
  parentId: string | null;
  authorId: string;
  targetUserId: string | null;
  replies?: CommentNode[];
};

const paramsSchema = z.object({
  postId: z.string().uuid(),
});

const createSchema = z.object({
  authorId: z.string().uuid(),
  content: z.string().min(1).max(600),
  parentCommentId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_comments")
    .select("*")
    .eq("post_id", params.data.postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  const comments = buildCommentTree(data ?? []);
  return NextResponse.json({ comments, total: data?.length ?? 0 });
}

export async function POST(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (countWords(parsed.data.content) > 100) {
    return NextResponse.json({ error: "Comment exceeds 100 words" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let parentInfo: JournalCommentRow | null = null;
  if (parsed.data.parentCommentId) {
    const { data: parent, error: parentError } = await supabase
      .from("journal_comments")
      .select("*")
      .eq("id", parsed.data.parentCommentId)
      .maybeSingle();

    if (parentError || !parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
    }

    if (parent.post_id !== params.data.postId) {
      return NextResponse.json({ error: "Parent comment mismatch" }, { status: 400 });
    }

    if (parent.parent_comment_id) {
      return NextResponse.json({ error: "Only one reply level is allowed" }, { status: 400 });
    }

    parentInfo = parent;
  }

  const insertPayload: Database["public"]["Tables"]["journal_comments"]["Insert"] = {
    post_id: params.data.postId,
    author_id: parsed.data.authorId,
    content: parsed.data.content,
    parent_comment_id: parsed.data.parentCommentId ?? null,
    target_user_id: parsed.data.targetUserId ?? parentInfo?.author_id ?? null,
  };

  const { data, error } = await supabase
    .from("journal_comments")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    postId: data.post_id,
    parentCommentId: data.parent_comment_id,
    content: data.content,
    createdAt: data.created_at,
    targetUserId: data.target_user_id,
  });
}

function buildCommentTree(rows: JournalCommentRow[]): CommentNode[] {
  const topLevel: CommentNode[] = [];
  const repliesMap = new Map<string, CommentNode[]>();

  rows.forEach((comment) => {
    const node: CommentNode = {
      id: comment.id,
      content: comment.deleted_at ? null : comment.content,
      createdAt: comment.created_at,
      deletedAt: comment.deleted_at,
      parentId: comment.parent_comment_id,
      authorId: comment.author_id,
      targetUserId: comment.target_user_id,
    };

    if (!comment.parent_comment_id) {
      topLevel.push(node);
    } else {
      const list = repliesMap.get(comment.parent_comment_id) ?? [];
      list.push(node);
      repliesMap.set(comment.parent_comment_id, list);
    }
  });

  return topLevel.map((comment) => ({
    ...comment,
    replies: repliesMap.get(comment.id) ?? [],
  }));
}

function countWords(content: string) {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}