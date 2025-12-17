import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

const payloadSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().trim().min(2).max(20).optional(),
    signature: z.string().trim().max(200).optional(),
    avatarUrl: z.string().url().optional(),
  })
  .refine((data) => data.displayName || data.signature !== undefined || data.avatarUrl, {
    message: "至少需要一个更新字段",
    path: ["displayName"],
  });

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { userId, displayName, signature, avatarUrl } = parsed.data;
  const updates: Database["public"]["Tables"]["users"]["Update"] = {};

  if (displayName !== undefined) {
    updates.display_name = displayName;
  }
  if (signature !== undefined) {
    updates.signature = signature || null;
  }
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id, username, display_name, role, avatar_url, signature")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "更新失败或用户不存在" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    role: data.role,
    avatar_url: data.avatar_url,
    signature: data.signature,
  });
}
