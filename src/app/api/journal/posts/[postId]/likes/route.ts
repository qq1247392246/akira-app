import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const paramsSchema = z.object({
  postId: z.string().uuid(),
});

const bodySchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("journal_likes")
    .select("id")
    .eq("post_id", params.data.postId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    return NextResponse.json({ error: "Failed to read like status" }, { status: 500 });
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from("journal_likes")
      .insert({ post_id: params.data.postId, user_id: parsed.data.userId });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: "Failed to like" }, { status: 500 });
    }
  }

  const count = await getLikeCount(params.data.postId);
  return NextResponse.json({ liked: true, total: count });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("journal_likes")
    .delete()
    .eq("post_id", params.data.postId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to remove like" }, { status: 500 });
  }

  const count = await getLikeCount(params.data.postId);
  return NextResponse.json({ liked: false, total: count });
}

async function getLikeCount(postId: string) {
  const { count, error } = await getSupabaseAdmin()
    .from("journal_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    console.error(error);
    return 0;
  }

  return count ?? 0;
}