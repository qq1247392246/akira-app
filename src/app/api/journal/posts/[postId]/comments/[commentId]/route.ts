import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

type RouteParams = {
  postId: string;
  commentId: string;
};

const paramsSchema = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
});

const bodySchema = z.object({
  actorId: z.string().uuid(),
  actorRole: z.number().int().optional(),
});

export async function DELETE(request: NextRequest, context: { params: Promise<RouteParams> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: comment, error } = await supabase
    .from("journal_comments")
    .select("*")
    .eq("id", params.data.commentId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch comment" }, { status: 500 });
  }

  if (!comment || comment.post_id !== params.data.postId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const isAdmin = parsed.data.actorRole === 1;
  if (!isAdmin && parsed.data.actorId !== comment.author_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (comment.deleted_at) {
    return NextResponse.json({ message: "Comment already deleted" });
  }

  const { error: updateError } = await supabase
    .from("journal_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", comment.id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ message: "Comment deleted" });
}