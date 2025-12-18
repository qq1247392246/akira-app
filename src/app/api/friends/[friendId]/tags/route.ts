import { NextRequest, NextResponse } from "next/server";
import { addFriendTag } from "@/server/friends-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { friendId } = await params;
    const body = await request.json().catch(() => ({}));
    const { label, authorId, viewerId } = body ?? {};
    if (!authorId) {
      return NextResponse.json({ error: "需要登录后才能创建标签" }, { status: 401 });
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "标签内容不能为空" }, { status: 400 });
    }

    const friend = await addFriendTag(friendId, label.trim(), authorId, viewerId ?? authorId);
    if (!friend) {
      return NextResponse.json({ error: "无法获取朋友信息" }, { status: 404 });
    }
    return NextResponse.json(friend);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "新增标签失败" },
      { status: 500 }
    );
  }
}
