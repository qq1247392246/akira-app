import { NextRequest, NextResponse } from "next/server";
import { removeFriendTag, toggleFriendTagLike } from "@/server/friends-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string; tagId: string }> }
) {
  try {
    const { friendId, tagId } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, userId, actorRole, viewerId } = body ?? {};

    if (action === "toggle-like") {
      if (!userId) {
        return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
      }
      const friend = await toggleFriendTagLike(friendId, tagId, userId, viewerId ?? userId);
      if (!friend) {
        return NextResponse.json({ error: "未找到标签对应的朋友" }, { status: 404 });
      }
      return NextResponse.json(friend);
    }

    if (action === "remove") {
      if (actorRole !== 1) {
        return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
      }
      const friend = await removeFriendTag(friendId, tagId, viewerId);
      if (!friend) {
        return NextResponse.json({ error: "未找到标签对应的朋友" }, { status: 404 });
      }
      return NextResponse.json(friend);
    }

    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "标签操作失败" },
      { status: 500 }
    );
  }
}
