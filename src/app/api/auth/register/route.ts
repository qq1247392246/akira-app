import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type RegistrationRequestRecord = Pick<
  Database["public"]["Tables"]["registration_requests"]["Row"],
  "id" | "status"
>;

const registerSchema = z.object({
  username: z.string().min(3).max(40),
  displayName: z.string().min(1).max(60),
  password: z.string().min(4).max(256),
  signature: z.string().max(140).nullable().optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("解析注册请求失败", error);
    return NextResponse.json({ error: "请求体不是有效的 JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "注册信息格式不正确" }, { status: 400 });
  }

  const { username, displayName, password, signature } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    const existingUser = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser.data) {
      return NextResponse.json({ error: "该用户名已被占用" }, { status: 409 });
    }

    const pendingRequest = await supabase
      .from("registration_requests")
      .select("id, status")
      .eq("username", username)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestRequest = pendingRequest.data as RegistrationRequestRecord | null;

    if (latestRequest && latestRequest.status === "pending") {
      return NextResponse.json({ error: "该用户已提交申请，请等待审核" }, { status: 409 });
    }

    const insertResult = await supabase
      .from("registration_requests")
      .insert({
        username,
        display_name: displayName,
        password_hash: password,
        signature: signature ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertResult.error) {
      console.error("创建注册请求失败", insertResult.error);
      return NextResponse.json({ error: "创建注册请求失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "注册申请已提交，等待审核" }, { status: 201 });
  } catch (error) {
    console.error("注册流程异常", error);
    return NextResponse.json({ error: "服务器异常" }, { status: 500 });
  }
}
