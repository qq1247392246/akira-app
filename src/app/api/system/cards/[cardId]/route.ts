import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const paramsSchema = z.object({ cardId: z.string().uuid() });

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(280).optional().nullable(),
  type: z.enum(["internal", "external"]).optional(),
  targetUrl: z.string().url().optional().nullable(),
  routePath: z.string().optional().nullable(),
  backgroundUrl: z.string().url().optional().nullable(),
  orderIndex: z.number().int().optional(),
  isAdminOnly: z.boolean().optional(),
  updatedBy: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ cardId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("cards")
    .update({
      title: parsed.data.title,
      description: typeof parsed.data.description === "undefined" ? undefined : parsed.data.description,
      type: parsed.data.type,
      target_url: typeof parsed.data.targetUrl === "undefined" ? undefined : parsed.data.targetUrl,
      route_path: typeof parsed.data.routePath === "undefined" ? undefined : parsed.data.routePath,
      background_url: typeof parsed.data.backgroundUrl === "undefined" ? undefined : parsed.data.backgroundUrl,
      order_index: parsed.data.orderIndex,
      is_admin_only: parsed.data.isAdminOnly,
      updated_by: parsed.data.updatedBy ?? null,
    })
    .eq("id", params.data.cardId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }

  return NextResponse.json({ message: "Card updated" });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ cardId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cards").delete().eq("id", params.data.cardId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }

  return NextResponse.json({ message: "Card deleted" });
}