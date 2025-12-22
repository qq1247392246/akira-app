import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type JournalPostRow = Database["public"]["Tables"]["journal_posts"]["Row"];

const paramsSchema = z.object({
  postId: z.string().uuid(),
});

const MAX_MEDIA_ITEMS = 9;

const updateSchema = z.object({
  authorId: z.string().uuid(),
  title: z.string().max(120).optional(),
  content: z.string().min(1).optional(),
  visibility: z.enum(["public"]).optional(),
  mediaUrls: z.array(z.string().url()).max(MAX_MEDIA_ITEMS).optional(),
});

const deleteSchema = z.object({
  authorId: z.string().uuid(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { authorId, title, content, visibility, mediaUrls } = parsed.data;
  const supabase = getSupabaseAdmin();

  const existing = await fetchPost(params.data.postId);
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existing.author_id !== authorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload: Partial<JournalPostRow> = {};
  if (typeof title !== "undefined") payload.title = title;
  if (typeof content !== "undefined") payload.content = content;
  if (typeof visibility !== "undefined") payload.visibility = visibility;

  if (Object.keys(payload).length > 0) {
    const { error: updateError } = await supabase
      .from("journal_posts")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
  }

  if (typeof mediaUrls !== "undefined") {
    const { error: deleteMediaError } = await supabase.from("journal_media").delete().eq("post_id", existing.id);
    if (deleteMediaError) {
      console.error(deleteMediaError);
      return NextResponse.json({ error: "Failed to reset media" }, { status: 500 });
    }

    if (mediaUrls.length) {
      const payloadMedia = mediaUrls.map((url, index) => ({
        post_id: existing.id,
        asset_url: url,
        position: index,
      }));
      const { error: insertMediaError } = await supabase.from("journal_media").insert(payloadMedia);
      if (insertMediaError) {
        console.error(insertMediaError);
        return NextResponse.json({ error: "Failed to save media" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ message: "Post updated" });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await fetchPost(params.data.postId);
  if (!existing) {
    return NextResponse.json({ message: "Post already removed" });
  }

  if (existing.author_id !== parsed.data.authorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("journal_posts").delete().eq("id", existing.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ message: "Post deleted" });
}

async function fetchPost(postId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("journal_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  return data ?? null;
}
