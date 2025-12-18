import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type UserAuthRecord = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "username" | "display_name" | "role" | "avatar_url" | "signature" | "password_hash" | "is_active"
>;

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("解析登录请求失败", error);
    return NextResponse.json({ error: "请求体不是有效的 JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "用户名或密码格式不正确" }, { status: 400 });
  }

  const { username, password } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, role, avatar_url, signature, password_hash, is_active")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("查询用户失败", error);
      return NextResponse.json({ error: "登录查询异常" }, { status: 500 });
    }

    const userRecord = data as UserAuthRecord | null;

    if (!userRecord || userRecord.password_hash !== password) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    if (!userRecord.is_active) {
      return NextResponse.json({ error: "账号已被停用" }, { status: 403 });
    }

    const user = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      role: userRecord.role,
      avatarUrl: userRecord.avatar_url,
      signature: userRecord.signature,
    };

    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("user_daily_activity")
      .upsert(
        { user_id: userRecord.id, activity_date: today },
        { onConflict: "user_id,activity_date" }
      );

    return NextResponse.json({ user });
  } catch (error) {
    console.error("登录流程异常", error);
    return NextResponse.json({ error: "服务器异常" }, { status: 500 });
  }
}
