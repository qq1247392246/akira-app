import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().max(280).optional(),
  type: z.enum(["internal", "external"]).optional(),
  targetUrl: z.string().url().optional(),
  routePath: z.string().optional(),
  backgroundUrl: z.string().url().optional(),
  orderIndex: z.number().int().optional(),
  isAdminOnly: z.boolean().optional(),
  createdBy: z.string().uuid().optional(),
});

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cards")
    .select("*, card_assets(*)")
    .order("order_index", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "获取卡片失败" }, { status: 500 });
  }

  const items = (data ?? []).map((card) => ({
    id: card.id,
    slug: card.slug,
    title: card.title,
    description: card.description,
    type: card.type,
    targetUrl: card.target_url,
    routePath: card.route_path,
    backgroundUrl: card.background_url,
    orderIndex: card.order_index,
    isAdminOnly: card.is_admin_only,
    assets: (card.card_assets ?? []).map((asset) => ({
      id: asset.id,
      url: asset.asset_url,
      type: asset.type,
    })),
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体不合法" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cards")
    .insert({
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type ?? "internal",
      target_url: parsed.data.targetUrl ?? null,
      route_path: parsed.data.routePath ?? null,
      background_url: parsed.data.backgroundUrl ?? null,
      order_index: parsed.data.orderIndex ?? 100,
      is_admin_only: parsed.data.isAdminOnly ?? false,
      created_by: parsed.data.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "创建卡片失败" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    title: data.title,
    orderIndex: data.order_index,
  });
}