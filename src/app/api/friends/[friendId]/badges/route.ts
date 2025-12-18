import { NextRequest, NextResponse } from "next/server";
import { addFriendBadge } from "@/server/friends-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { friendId } = await params;
    const body = await request.json().catch(() => ({}));
    const { label, colorClass, actorRole, viewerId } = body ?? {};
    if (actorRole !== 1) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    if (!label || typeof label !== "string" || !colorClass) {
      return NextResponse.json({ error: "徽章名称与颜色必填" }, { status: 400 });
    }
    const friend = await addFriendBadge(friendId, { label, colorClass }, viewerId);
    if (!friend) {
      return NextResponse.json({ error: "未找到朋友信息" }, { status: 404 });
    }
    return NextResponse.json(friend);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "新增徽章失败" },
      { status: 500 }
    );
  }
}

