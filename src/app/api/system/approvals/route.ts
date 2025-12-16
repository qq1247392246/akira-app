import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const querySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "查询参数不合法" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("registration_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit ?? 50);

  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "获取审核列表失败" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}